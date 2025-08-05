// plugins/quipubase.ts
import Quipubase from 'quipubase-sdk'
import type { App } from 'vue'

const quipu = new Quipubase({
	baseURL: 'https://quipubase.oscarbahamonde.com/v1',
	apiKey: import.meta.env.VITE_QUIPUBASE_API_KEY || '[DEFAULT]',
	timeout: 86400
})

export default {
	install(app: App) {
		app.config.globalProperties.$quipu = quipu
		app.provide('quipu', quipu)
	}
}

export { quipu }

// composables/useQuipubase.ts
import { inject } from 'vue'
import type Quipubase from 'quipubase-sdk'

export const useQuipubase = (): Quipubase => {
	const quipu = inject<Quipubase>('quipu')
	if (!quipu) {
		throw new Error('Quipubase not provided')
	}
	return quipu
}