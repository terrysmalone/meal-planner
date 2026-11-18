import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type Household = {
  id: string
  name: string
  invite_code: string
}

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export const signIn = async (email: string, password: string) => {
  const result = await supabase.auth.signInWithPassword({ email, password })
  if (result.error) throw result.error
  return result.data.session
}

export const signUp = async (email: string, password: string) => {
  const result = await supabase.auth.signUp({ email, password })
  if (result.error) throw result.error
  return result.data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const createHousehold = async (name: string) => {
  const { data, error } = await supabase.rpc('create_household', { household_name: name })
  if (error) throw error
  return data as Household
}

export const joinHousehold = async (inviteCode: string) => {
  const { data, error } = await supabase.rpc('join_household', { household_invite_code: inviteCode })
  if (error) throw error
  return data as Household
}

export const listHouseholds = async (user: User) => {
  const { data, error } = await supabase
    .from('household_members')
    .select('household:households(id, name, invite_code)')
    .eq('user_id', user.id)
  if (error) throw error
  return (data ?? [])
    .map((row) => (Array.isArray(row.household) ? row.household[0] : row.household) as unknown as Household)
    .filter((household): household is Household => Boolean(household?.id))
}

export const subscribeToAuthChanges = (callback: (session: Session | null) => void) =>
  supabase.auth.onAuthStateChange((_event, session) => callback(session))
