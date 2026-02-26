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

      // Charger les provision stocks
      await get().loadProvisionStocks()

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
        shared_savings_transfer: data.sharedSavingsTransfer || 0,
        partner_shared_savings_transfer: data.partnerSharedSavingsTransfer || 0,
        existing_shared_savings: data.existingSharedSavings || 0,
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
      .upsert({
        profile_id: userProfile.id,
        year: data.year,
        start_month: data.startMonth,
        monthly_salary_net: data.monthlySalaryNet,
        fun_savings_monthly_target: data.funSavingsMonthlyTarget,
        is_active: true
      }, { onConflict: 'profile_id,year' })
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
        is_unplanned: item.is_unplanned || false,
        unplanned_month: item.unplanned_month || null,
        funded_from_savings: item.funded_from_savings || 0,
        funded_from_free: item.funded_from_free || 0,
        funded_from_shared_savings: item.funded_from_shared_savings || 0,
        goes_to_savings: item.goes_to_savings || false,
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

  createCheckIn: async (data) => {
    const { activePlan, userProfile } = get()
    if (!activePlan) return

    const { error } = await supabase
      .from('check_ins')
      .upsert({
        plan_id: activePlan.id,
        month: data.month,
        year: data.year,
        fun_savings_done: data.fun_savings_done,
        fun_savings_amount: data.fun_savings_amount,
        personal_provisions_done: data.personal_provisions_done,
        personal_provisions_amount: data.personal_provisions_amount,
        common_transfer_done: data.common_transfer_done,
        common_transfer_amount: data.common_transfer_amount,
        shared_savings_done: data.shared_savings_done,
        shared_savings_amount: data.shared_savings_amount,
      }, { onConflict: 'plan_id,month,year' })

    if (error) throw error

    // Mise à jour automatique des stocks d'épargne
    const updates = {}
    
    // Épargne projet
    if (data.fun_savings_done && data.fun_savings_amount > 0) {
      updates.existing_savings = (userProfile.existing_savings || 0) + data.fun_savings_amount
    }
    
    // Épargne commune
    if (data.shared_savings_done && data.shared_savings_amount > 0) {
      updates.existing_shared_savings = (userProfile.existing_shared_savings || 0) + data.shared_savings_amount
    }

    // Appliquer les mises à jour si nécessaire
    if (Object.keys(updates).length > 0) {
      await get().updateProfile(updates)
    }
  },

  // ══════════════════════════════════════════════════════════════════════
  // PROVISION STOCKS TRACKING (v7)
  // ══════════════════════════════════════════════════════════════════════
  
  provisionStocks: [],

  loadProvisionStocks: async () => {
    const { activePlan } = get()
    if (!activePlan) return

    try {
      const { data, error } = await supabase
        .from('provision_stocks')
        .select('*')
        .eq('plan_id', activePlan.id)

      if (error) throw error
      set({ provisionStocks: data || [] })
    } catch (e) {
      console.log('loadProvisionStocks:', e.message)
    }
  },

  updateProvisionStock: async (itemId, amount) => {
    const { activePlan, provisionStocks } = get()
    if (!activePlan) return

    try {
      const { data, error } = await supabase
        .from('provision_stocks')
        .upsert({
          plan_id: activePlan.id,
          item_id: itemId,
          amount_saved: amount,
        }, { onConflict: 'plan_id,item_id' })
        .select()
        .single()

      if (error) throw error

      // Mettre à jour le state local
      const existing = provisionStocks.find(ps => ps.item_id === itemId)
      if (existing) {
        set({ provisionStocks: provisionStocks.map(ps => ps.item_id === itemId ? data : ps) })
      } else {
        set({ provisionStocks: [...provisionStocks, data] })
      }
    } catch (e) {
      console.log('updateProvisionStock:', e.message)
      throw e
    }
  },

  updateMultipleProvisionStocks: async (updates) => {
    const { activePlan } = get()
    if (!activePlan || updates.length === 0) return

    try {
      const upserts = updates.map(u => ({
        plan_id: activePlan.id,
        item_id: u.itemId,
        amount_saved: u.amount,
      }))

      const { error } = await supabase
        .from('provision_stocks')
        .upsert(upserts, { onConflict: 'plan_id,item_id' })

      if (error) throw error

      // Recharger tous les stocks
      await get().loadProvisionStocks()
    } catch (e) {
      console.log('updateMultipleProvisionStocks:', e.message)
      throw e
    }
  },

  getProvisionStock: (itemId) => {
    const { provisionStocks } = get()
    const stock = provisionStocks.find(ps => ps.item_id === itemId)
    return stock ? stock.amount_saved : 0
  },

  spendProvision: async (itemId, amountSpent, isCommon = false) => {
    const { userProfile } = get()
    if (!userProfile) return

    try {
      // Diminuer le stock de la provision
      const currentStock = get().getProvisionStock(itemId)
      const newStock = Math.max(0, currentStock - amountSpent)
      await get().updateProvisionStock(itemId, newStock)

      // Diminuer le stock global correspondant
      if (isCommon) {
        await get().updateProfile({
          existing_shared_savings: Math.max(0, (userProfile.existing_shared_savings || 0) - amountSpent)
        })
      } else {
        await get().updateProfile({
          existing_provisions: Math.max(0, (userProfile.existing_provisions || 0) - amountSpent)
        })
      }
    } catch (e) {
      console.log('spendProvision:', e.message)
      throw e
    }
  },

  reset: () => set({
    user: null,
    userProfile: null,
    activePlan: null,
    items: [],
    provisionStocks: [],
    loading: false
  })
}))

export default useStore