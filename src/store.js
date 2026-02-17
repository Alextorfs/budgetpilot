import { create } from 'zustand'
import { supabase } from './supabaseClient'

const useStore = create((set, get) => ({
  user: null,
  userProfile: null,
  activePlan: null,
  items: [],
  loading: false,

  setUser: (user) => set({ user }),

  loadUserData: async (userId) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (!profile) return

      set({ userProfile: profile })

      const { data: plan } = await supabase
        .from('plans')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('is_active', true)
        .single()

      if (!plan) return

      set({ activePlan: plan })

      const { data: items } = await supabase
        .from('items')
        .select('*')
        .eq('plan_id', plan.id)
        .eq('is_active', true)

      set({ items: items || [] })

    } catch (e) {
      console.log('loadUserData:', e.message)
    }
  },

  setUserProfile: async (data) => {
    const { user } = get()
    if (!user) return null

    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        first_name: data.firstName,
        existing_savings: data.existingSavings,
        has_shared_account: data.hasSharedAccount,
        shared_monthly_transfer: data.sharedMonthlyTransfer,
        partner_monthly_transfer: data.partnerMonthlyTransfer || 0,
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (error) throw error
    set({ userProfile: profile })
    return profile
  },

  createPlan: async (data) => {
    const { userProfile } = get()
    if (!userProfile) return null

    const { data: plan, error } = await supabase
      .from('plans')
      .insert({
        profile_id: userProfile.id,
        year: data.year,
        start_month: data.startMonth,
        monthly_salary_net: data.monthlySalaryNet,
        fun_savings_monthly_target: data.funSavingsMonthlyTarget,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    set({ activePlan: plan })
    return plan
  },

  addItem: async (item) => {
    const { activePlan, items } = get()
    if (!activePlan) return

    const { data, error } = await supabase
      .from('items')
      .insert({
        plan_id: activePlan.id,
        title: item.title,
        category: item.category || 'other',
        kind: item.kind || 'expense',
        frequency: item.frequency,
        amount: item.amount,
        payment_month: item.payment_month || null,
        allocation_mode: item.allocation_mode || null,
        sharing_type: item.sharing_type || 'individual',
        my_share_percent: item.my_share_percent || 100,
        is_included_in_shared_transfer: item.is_included_in_shared_transfer || false,
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    set({ items: [...items, data] })
  },

  addItems: async (newItems) => {
    const { activePlan, items } = get()
    if (!activePlan || newItems.length === 0) return

    const toInsert = newItems.map(item => ({
      plan_id: activePlan.id,
      title: item.title || item.placeholder || 'Sans titre',
      category: item.category || 'other',
      kind: item.kind || 'expense',
      frequency: item.frequency,
      amount: item.amount,
      payment_month: item.frequency === 'monthly' ? null : (item.paymentMonth || item.payment_month || 1),
      allocation_mode: item.frequency === 'monthly' ? null : (item.allocationMode || item.allocation_mode || 'prorata'),
      sharing_type: item.sharingType || item.sharing_type || 'individual',
      my_share_percent: item.mySharePercent || item.my_share_percent || 100,
      is_included_in_shared_transfer: item.isIncludedInSharedTransfer || item.is_included_in_shared_transfer || false,
      is_active: true
    }))

    const { data, error } = await supabase
      .from('items')
      .insert(toInsert)
      .select()

    if (error) throw error
    set({ items: [...items, ...data] })
  },

  updateItem: async (itemId, updates) => {
    const { items } = get()

    const { data, error } = await supabase
      .from('items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error
    set({ items: items.map(i => i.id === itemId ? data : i) })
  },

  deleteItem: async (itemId) => {
    const { items } = get()

    const { error } = await supabase
      .from('items')
      .update({ is_active: false })
      .eq('id', itemId)

    if (error) throw error
    set({ items: items.filter(i => i.id !== itemId) })
  },

  updatePlan: async (updates) => {
    const { activePlan } = get()
    if (!activePlan) return
    const { data, error } = await supabase
      .from('plans')
      .update(updates)
      .eq('id', activePlan.id)
      .select()
      .single()
    if (error) throw error
    set({ activePlan: data })
  },

  updateProfile: async (updates) => {
    const { userProfile } = get()
    if (!userProfile) return

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userProfile.id)
      .select()
      .single()

    if (error) throw error
    set({ userProfile: data })
  },

  reset: () => set({
    user: null,
    userProfile: null,
    activePlan: null,
    items: [],
    loading: false
  })
}))

export default useStore
