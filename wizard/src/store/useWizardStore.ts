import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ClientInfo } from '@/types/wizard'
import { features } from '@/data/features'
import { TOTAL_STEPS } from '@/data/steps'

interface WizardStore {
  currentStepIndex: number
  direction: number
  clientInfo: ClientInfo
  selections: Record<string, string | boolean | number>
  editingLmsId: number | null
  lmsValidated: boolean

  setStep: (index: number) => void
  nextStep: () => void
  prevStep: () => void
  setClientInfo: (info: Partial<ClientInfo>) => void
  setSelection: (featureId: string, value: string | boolean | number) => void
  setLmsValidated: (v: boolean) => void
  resetWizard: () => void
  loadForEdit: (id: number, lms: any) => void
}

function getDefaultSelections(): Record<string, string | boolean | number> {
  const defaults: Record<string, string | boolean | number> = {}
  for (const feature of features) {
    defaults[feature.id] = feature.defaultValue
  }
  return defaults
}

export const useWizardStore = create<WizardStore>()(
  persist(
    (set) => ({
      currentStepIndex: 0,
      direction: 0,
      editingLmsId: null,
      lmsValidated: false,
      clientInfo: {
        clientName: '',
        companyName: '',
        date: new Date().toISOString().slice(0, 10),
        lmsName: '',
        baseUrl: '',
        platformName: 'Open edX',
        oauthClientId: '',
        description: '',
        feedbackEmail: '',
        accentColor: '#42AAFF',
        logoUrl: '',
        loginBackgroundUrl: '',
      },
      selections: getDefaultSelections(),

      setStep: (index: number) =>
        set((state) => ({
          direction: index > state.currentStepIndex ? 1 : -1,
          currentStepIndex: Math.max(0, Math.min(index, TOTAL_STEPS - 1)),
        })),

      nextStep: () =>
        set((state) => ({
          direction: 1,
          currentStepIndex: Math.min(state.currentStepIndex + 1, TOTAL_STEPS - 1),
        })),

      prevStep: () =>
        set((state) => ({
          direction: -1,
          currentStepIndex: Math.max(state.currentStepIndex - 1, 0),
        })),

      setClientInfo: (info) =>
        set((state) => ({
          clientInfo: { ...state.clientInfo, ...info },
        })),

      setSelection: (featureId, value) =>
        set((state) => ({
          selections: { ...state.selections, [featureId]: value },
        })),

      setLmsValidated: (v) => set({ lmsValidated: v }),

      loadForEdit: (id: number, lms: any) =>
        set({
          currentStepIndex: 0,
          direction: 0,
          editingLmsId: id,
          lmsValidated: true,
          clientInfo: {
            clientName: '',
            companyName: '',
            date: new Date().toISOString().slice(0, 10),
            lmsName: lms.name || '',
            baseUrl: lms.base_url || '',
            platformName: lms.platform_name || 'Open edX',
            oauthClientId: lms.oauth_client_id || '',
            description: lms.description || '',
            feedbackEmail: lms.feedback_email || '',
            accentColor: lms.accent_color || '#42AAFF',
            logoUrl: lms.logo_url || lms.logo_upload_url || '',
            loginBackgroundUrl: lms.login_background_url || '',
          },
          selections: {
            ...getDefaultSelections(),
            pre_login_experience: lms.pre_login_experience ?? true,
            dashboard_type: lms.dashboard_type || 'gallery',
            course_progress: lms.course_unit_progress ?? true,
            course_dropdown_nav: lms.course_dropdown_nav ?? true,
            unknown_units_mode: lms.unknown_units_mode || 'block',
          },
        }),

      resetWizard: () =>
        set({
          currentStepIndex: 0,
          direction: 0,
          editingLmsId: null,
          lmsValidated: false,
          clientInfo: {
            clientName: '',
            companyName: '',
            date: new Date().toISOString().slice(0, 10),
            lmsName: '',
            baseUrl: '',
            platformName: 'Open edX',
            oauthClientId: '',
            description: '',
            feedbackEmail: '',
            accentColor: '#42AAFF',
            logoUrl: '',
          },
          selections: getDefaultSelections(),
        }),
    }),
    {
      name: 'openedx-wizard-state',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
