import { randomUUID } from 'node:crypto'
import { EmailAccount } from '../models/EmailAccount.js'
import { encryptSecret, decryptSecret } from './cryptoService.js'
import {
  GMAIL_SCOPES,
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken,
  fetchGmailProfile,
  fetchInboxThreads,
} from './gmailService.js'
import { upsertSyncedThread } from './threadService.js'
import { isGmailConfigured } from './gmailService.js'

const publicAccount = (account, options = {}) => ({
  id: String(account._id),
  provider: account.provider,
  providerEmail: account.providerEmail,
  connectionStatus: account.connectionStatus,
  lastSynchronizationTime: account.lastSynchronizationTime,
  lastError: account.lastError || '',
  configured: isGmailConfigured(),
  // Tokens are intentionally never included.
  ...options,
})

export const listAccounts = async (userId) => {
  const accounts = await EmailAccount.find({ owner: userId }).lean()
  return accounts.map((account) => publicAccount(account))
}

export const getConnectedAccount = async (userId, provider = 'GMAIL') => {
  const account = await EmailAccount.findOne({ owner: userId, provider, connectionStatus: 'CONNECTED' })
  return account || null
}

export const getGoogleAuthUrl = (sessionToken) => {
  if (!isGmailConfigured()) {
    const error = new Error('Gmail integration is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI to the server environment.')
    error.status = 501
    throw error
  }
  return buildGoogleAuthUrl(sessionToken)
}

/**
 * Complete the OAuth flow: exchange the code, read the mailbox profile,
 * and store encrypted credentials for the user.
 */
export const completeGoogleConnect = async (userId, code) => {
  const tokens = await exchangeCodeForTokens(code)
  const profile = await fetchGmailProfile(tokens.access_token)

  const account = await EmailAccount.findOneAndUpdate(
    { owner: userId, provider: 'GMAIL' },
    {
      $set: {
        providerAccountId: String(profile.emailAddress || ''),
        providerEmail: String(profile.emailAddress || '').toLowerCase(),
        connectionStatus: 'CONNECTED',
        scopes: GMAIL_SCOPES.join(' '),
        accessTokenEnc: encryptSecret(tokens.access_token),
        refreshTokenEnc: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : '',
        tokenExpiry: new Date(Date.now() + (Number(tokens.expires_in) || 3600) * 1000),
        lastError: '',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  return publicAccount(account)
}

/** Return a valid access token, refreshing (and persisting) it when expired. */
export const getFreshAccessToken = async (account) => {
  if (!account) {
    const error = new Error('No Gmail account is connected')
    error.status = 409
    throw error
  }
  const expiresSoon = !account.tokenExpiry || account.tokenExpiry.getTime() - Date.now() < 60000
  if (!expiresSoon) {
    try {
      return decryptSecret(account.accessTokenEnc)
    } catch {
      // fall through to refresh
    }
  }

  let refreshToken = ''
  try {
    refreshToken = account.refreshTokenEnc ? decryptSecret(account.refreshTokenEnc) : ''
  } catch {
    refreshToken = ''
  }
  if (!refreshToken) {
    account.connectionStatus = 'ERROR'
    account.lastError = 'No refresh token available. Reconnect your Gmail account.'
    await account.save()
    const error = new Error('Gmail session expired. Please reconnect your account.')
    error.status = 401
    throw error
  }

  try {
    const refreshed = await refreshAccessToken(refreshToken)
    account.accessTokenEnc = encryptSecret(refreshed.access_token)
    account.tokenExpiry = new Date(Date.now() + (Number(refreshed.expires_in) || 3600) * 1000)
    account.connectionStatus = 'CONNECTED'
    account.lastError = ''
    await account.save()
    return refreshed.access_token
  } catch (refreshError) {
    account.connectionStatus = 'ERROR'
    account.lastError = refreshError.message
    await account.save()
    throw refreshError
  }
}

/** Revoke Google credentials and remove the stored connection. */
export const disconnectAccount = async (userId, accountId) => {
  const filter = accountId
    ? { owner: userId, _id: accountId }
    : { owner: userId }
  const accounts = await EmailAccount.find(filter)
  for (const account of accounts) {
    try {
      const token = account.refreshTokenEnc ? decryptSecret(account.refreshTokenEnc) : decryptSecret(account.accessTokenEnc)
      await revokeToken(token)
    } catch {
      // best-effort revocation
    }
    await EmailAccount.deleteOne({ _id: account._id })
  }
  return { disconnected: accounts.length }
}

/**
 * Fetch the connected Gmail inbox, group messages into conversations,
 * run AI classification on each, and persist them for the user.
 */
export const syncGmailAccount = async (userId, userEmail, { maxMessages = 60 } = {}) => {
  const account = await getConnectedAccount(userId)
  if (!account) {
    const error = new Error('Connect a Gmail account before syncing.')
    error.status = 409
    throw error
  }

  let accessToken
  try {
    accessToken = await getFreshAccessToken(account)
  } catch (tokenError) {
    const failure = new Error(tokenError.message)
    failure.status = tokenError.status || 401
    throw failure
  }

  const gmailThreads = await fetchInboxThreads(accessToken, account.providerEmail || userEmail, { maxMessages })
  let updated = 0
  let classified = 0
  const counts = { ASSISTANT_REPLY: 0, CLIENT_REPLY: 0, NO_REPLY_NEEDED: 0, NEEDS_REVIEW: 0 }
  for (const gmailThread of gmailThreads) {
    const persisted = await upsertSyncedThread(userEmail, gmailThread)
    if (persisted) {
      updated += 1
      classified += 1
      counts[persisted.classification] = (counts[persisted.classification] || 0) + 1
    }
  }

  account.lastSynchronizationTime = new Date()
  account.connectionStatus = 'CONNECTED'
  account.lastError = ''
  await account.save()

  return {
    conversationsSynced: updated,
    classified,
    counts,
    account: publicAccount(account),
  }
}
