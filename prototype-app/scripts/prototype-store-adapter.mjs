import * as jsonStore from './prototype-store.mjs'
import * as postgresStore from './prototype-store-postgres.mjs'

const store = process.env.E4H_STORE === 'postgres' ? postgresStore : jsonStore

export const createClaims = store.createClaims
export const createContribution = store.createContribution
export const createProfile = store.createProfile
export const createUser = store.createUser
export const loginUser = store.loginUser
export const loadSnapshot = store.loadSnapshot
export const updateContributionProfile = store.updateContributionProfile
export const updateUserProfile = store.updateUserProfile
export const updateUserVerification = store.updateUserVerification
