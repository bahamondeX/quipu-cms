// stores/auth.ts
import { defineStore, acceptHMRUpdate } from 'pinia'
import { ref, computed } from 'vue'
import { User, type UserType } from '~/models'

export const useAuthStore = defineStore('auth', () => {
	// State
	const user = ref<UserType | null>(null)
	const token = ref<string | null>(null)
	const isAuthenticated = ref(false)
	const isLoading = ref(false)
	const permissions = ref<string[]>([])

	// Getters
	const isAdmin = computed(() => user.value?.role === 'admin')
	const isEditor = computed(() => ['admin', 'editor'].includes(user.value?.role || ''))
	const isAuthor = computed(() => ['admin', 'editor', 'author'].includes(user.value?.role || ''))

	const canManageUsers = computed(() => user.value?.role === 'admin')
	const canManageSettings = computed(() => user.value?.role === 'admin')
	const canManageThemes = computed(() => user.value?.role === 'admin')
	const canPublishPosts = computed(() => ['admin', 'editor', 'author'].includes(user.value?.role || ''))
	const canEditOthersContent = computed(() => ['admin', 'editor'].includes(user.value?.role || ''))

	const userDisplayName = computed(() => {
		if (!user.value) return 'Guest'
		return user.value.display_name || user.value.username || 'User'
	})

	const userAvatar = computed(() => {
		return user.value?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(
			user.value?.display_name || user.value?.username || 'U'
		)}&background=6366f1&color=ffffff`
	})

	// Actions
	const login = async (credentials: { email: string; password: string }) => {
		isLoading.value = true

		try {
			const foundUser = await User.getByEmail(credentials.email)

			if (!foundUser) {
				throw new Error('Invalid credentials')
			}

			// TODO: Verify password hash
			// const isValidPassword = await verifyPassword(credentials.password, foundUser.password_hash)
			// if (!isValidPassword) throw new Error('Invalid credentials')

			user.value = foundUser
			token.value = `fake-jwt-token-${foundUser.id}`
			isAuthenticated.value = true

			// Update last login
			await updateUser(foundUser.id, {
				last_login: new Date().toISOString()
			})

			return foundUser
		} catch (error) {
			console.error('Login failed:', error)
			throw error
		} finally {
			isLoading.value = false
		}
	}

	const register = async (userData: {
		username: string
		email: string
		password: string
		display_name: string
	}) => {
		isLoading.value = true

		try {
			const existingUser = await User.getByEmail(userData.email)
			if (existingUser) {
				throw new Error('User already exists')
			}

			const existingUsername = await User.getByUsername(userData.username)
			if (existingUsername) {
				throw new Error('Username already taken')
			}

			// TODO: Hash password
			// const passwordHash = await hashPassword(userData.password)

			const newUser = new User({
				id: crypto.randomUUID(),
				...userData,
				role: 'subscriber',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				password_hash: userData.password,
				preferences: {},
				social: {},
				last_login: new Date().toISOString(),
				avatar: undefined,
				last_name: undefined,
				first_name: undefined,
				website: undefined,
				
			})	
			await newUser.upsert()

			// Auto login after registration
			user.value = newUser.modelDump()
			token.value = `fake-jwt-token-${newUser.modelDump().id}`
			isAuthenticated.value = true

			return newUser.modelDump()
		} catch (error) {
			console.error('Registration failed:', error)
			throw error
		} finally {
			isLoading.value = false
		}
	}

	const logout = async () => {
		user.value = null
		token.value = null
		isAuthenticated.value = false
		permissions.value = []

		localStorage.removeItem('quipu-cms-auth')
	}

	const getCurrentUser = async () => {
		if (!token.value || !user.value) return null

		try {
			const users = await User.query({ id: user.value.id })
			if (users.length > 0) {
				user.value = users[0]
				return users[0]
			}

			await logout()
			return null
		} catch (error) {
			console.error('Failed to get current user:', error)
			await logout()
			return null
		}
	}

	const updateUser = async (id: string, updates: Partial<UserType>) => {
		try {
			const users = await User.query({ id })
			if (users.length === 0) throw new Error('User not found')

			const userData = { ...users[0], ...updates, updated_at: new Date().toISOString() }
			const userModel = new User(userData)

			await userModel.upsert()

			if (user.value?.id === id) {
				user.value = userModel.modelDump()
			}

			return userModel.modelDump()
		} catch (error) {
			console.error('Failed to update user:', error)
			throw error
		}
	}

	const updateProfile = async (updates: Partial<UserType>) => {
		if (!user.value) throw new Error('Not authenticated')

		return await updateUser(user.value.id, updates)
	}

	const changePassword = async (currentPassword: string, newPassword: string) => {
		if (!user.value) throw new Error('Not authenticated')

		try {
			// TODO: Verify current password
			// const isValid = await verifyPassword(currentPassword, user.value.password_hash)
			// if (!isValid) throw new Error('Current password is incorrect')

			// TODO: Hash new password
			// const newPasswordHash = await hashPassword(newPassword)

			await updateUser(user.value.id, {
				password_hash: `hashed-${newPassword}` // TODO: Proper hashing
			})

			return true
		} catch (error) {
			console.error('Failed to change password:', error)
			throw error
		}
	}

	const canEdit = (content: { author_id: string }) => {
		if (!user.value) return false

		const userModel = new User(user.value)
		return userModel.canEdit(content as any)
	}

	const hasRole = (role: UserType['role'] | UserType['role'][]) => {
		if (!user.value) return false

		if (Array.isArray(role)) {
			return role.includes(user.value.role)
		}

		return user.value.role === role
	}

	const hasPermission = (permission: string) => {
		return permissions.value.includes(permission)
	}

	const initializeAuth = async () => {
		const stored = localStorage.getItem('quipu-cms-auth')
		if (stored) {
			try {
				const { user: storedUser, token: storedToken } = JSON.parse(stored)
				user.value = storedUser
				token.value = storedToken
				isAuthenticated.value = true

				await getCurrentUser()
			} catch (error) {
				console.error('Failed to restore auth state:', error)
				await logout()
			}
		}
	}

	return {
		// State
		user: readonly(user),
		token: readonly(token),
		isAuthenticated: readonly(isAuthenticated),
		isLoading: readonly(isLoading),
		permissions: readonly(permissions),

		// Getters
		isAdmin,
		isEditor,
		isAuthor,
		canManageUsers,
		canManageSettings,
		canManageThemes,
		canPublishPosts,
		canEditOthersContent,
		userDisplayName,
		userAvatar,

		// Actions
		login,
		register,
		logout,
		getCurrentUser,
		updateUser,
		updateProfile,
		changePassword,
		canEdit,
		hasRole,
		hasPermission,
		initializeAuth
	}
})

// Auth middleware
export const requireAuth = () => {
	const authStore = useAuthStore()

	if (!authStore.isAuthenticated) {
		throw new Error('Authentication required')
	}

	return true
}

export const requireRole = (roles: UserType['role'] | UserType['role'][]) => {
	const authStore = useAuthStore()

	requireAuth()

	if (!authStore.hasRole(roles)) {
		throw new Error('Insufficient permissions')
	}

	return true
}

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
}