import { defineStore, acceptHMRUpdate } from 'pinia'
import { ref, computed, readonly } from 'vue'
import type { Block, BlockContext } from '~/types/blocks'

const findBlockById = (blocks: Block[], id: string): Block | null => {
	for (const block of blocks) {
		if (block.id === id) return block
		if (block.children) {
			const found = findBlockById(block.children, id)
			if (found) return found
		}
	}
	return null
}

const removeBlockById = (blocks: Block[], id: string): Block[] => {
	return blocks.filter(block => {
		if (block.id === id) return false
		if (block.children) {
			block.children = removeBlockById(block.children, id)
		}
		return true
	})
}

export const useEditorStore = defineStore('editor', () => {
	// State
	const blocks = ref<Block[]>([])
	const selectedBlockId = ref<string | null>(null)
	const isEditing = ref(false)
	const history = ref({
		past: [] as Block[][],
		present: [] as Block[],
		future: [] as Block[][]
	})
	const devicePreview = ref<'desktop' | 'tablet' | 'mobile'>('desktop')
	const showSettings = ref(false)
	const showBlockInserter = ref(false)

	// Getters
	const selectedBlock = computed(() => {
		if (!selectedBlockId.value) return null
		return findBlockById(blocks.value, selectedBlockId.value)
	})

	const canUndo = computed(() => history.value.past.length > 0)
	const canRedo = computed(() => history.value.future.length > 0)

	const rootBlocks = computed(() => blocks.value)

	const blockContext = computed(() => (blockId: string): BlockContext => ({
		isSelected: selectedBlockId.value === blockId,
		isEditing: isEditing.value,
		clientId: blockId,
		setContent: (content: Record<string, any>) => {
			updateBlockContent(blockId, content)
		},
		setSettings: (settings: Record<string, any>) => {
			updateBlockSettings(blockId, settings)
		},
		insertBlock: (block: Block, index?: number) => {
			insertBlock(block, index)
		},
		removeBlock: (clientId: string) => {
			removeBlock(clientId)
		},
		selectBlock: (clientId: string) => {
			selectedBlockId.value = clientId
		}
	}))

	// Actions
	const addBlock = (block: Block, index?: number) => {
		saveToHistory()

		if (index !== undefined) {
			blocks.value.splice(index, 0, block)
		} else {
			blocks.value.push(block)
		}

		selectedBlockId.value = block.id
	}

	const insertBlock = (block: Block, index?: number) => {
		addBlock(block, index)
	}

	const removeBlock = (blockId: string) => {
		saveToHistory()
		blocks.value = removeBlockById(blocks.value, blockId)

		if (selectedBlockId.value === blockId) {
			selectedBlockId.value = null
		}
	}

	const duplicateBlock = (blockId: string) => {
		const block = findBlockById(blocks.value, blockId)
		if (!block) return

		const duplicate = JSON.parse(JSON.stringify(block))
		duplicate.id = crypto.randomUUID()

		const updateIds = (blocksList: Block[]) => {
			blocksList.forEach(b => {
				b.id = crypto.randomUUID()
				if (b.children) updateIds(b.children)
			})
		}

		if (duplicate.children) updateIds(duplicate.children)

		const index = findBlockIndex(blockId)
		addBlock(duplicate, index + 1)
	}

	const moveBlock = (blockId: string, direction: 'up' | 'down') => {
		saveToHistory()

		const index = findBlockIndex(blockId)
		if (index === -1) return

		const newIndex = direction === 'up' ? index - 1 : index + 1
		if (newIndex < 0 || newIndex >= blocks.value.length) return

		const block = blocks.value.splice(index, 1)[0]
		blocks.value.splice(newIndex, 0, block)
	}

	const updateBlockContent = (blockId: string, content: Record<string, any>) => {
		const block = findBlockById(blocks.value, blockId)
		if (!block) return

		saveToHistory()
		Object.assign(block.content, content)
	}

	const updateBlockSettings = (blockId: string, settings: Record<string, any>) => {
		const block = findBlockById(blocks.value, blockId)
		if (!block) return

		saveToHistory()
		Object.assign(block.settings, settings)
	}

	const selectBlock = (blockId: string | null) => {
		selectedBlockId.value = blockId
		showSettings.value = !!blockId
	}

	const saveToHistory = () => {
		history.value.past.push(JSON.parse(JSON.stringify(blocks.value)))
		history.value.future = []

		if (history.value.past.length > 50) {
			history.value.past.shift()
		}
	}

	const undo = () => {
		if (!canUndo.value) return

		history.value.future.unshift(JSON.parse(JSON.stringify(blocks.value)))
		blocks.value = history.value.past.pop()!
		selectedBlockId.value = null
	}

	const redo = () => {
		if (!canRedo.value) return

		history.value.past.push(JSON.parse(JSON.stringify(blocks.value)))
		blocks.value = history.value.future.shift()!
		selectedBlockId.value = null
	}

	const setBlocks = (newBlocks: Block[]) => {
		blocks.value = newBlocks
		selectedBlockId.value = null
		history.value = {
			past: [],
			present: newBlocks,
			future: []
		}
	}

	const clearBlocks = () => {
		saveToHistory()
		blocks.value = []
		selectedBlockId.value = null
	}

	const setDevicePreview = (device: 'desktop' | 'tablet' | 'mobile') => {
		devicePreview.value = device
	}

	const toggleBlockInserter = () => {
		showBlockInserter.value = !showBlockInserter.value
	}

	const toggleSettings = () => {
		showSettings.value = !showSettings.value
	}

	const findBlockIndex = (blockId: string): number => {
		return blocks.value.findIndex(block => block.id === blockId)
	}

	const getBlockPath = (blockId: string): number[] => {
		const path: number[] = []

		const findPath = (blocksList: Block[], currentPath: number[]): boolean => {
			for (let i = 0; i < blocksList.length; i++) {
				const block = blocksList[i]
				const newPath = [...currentPath, i]

				if (block.id === blockId) {
					path.push(...newPath)
					return true
				}

				if (block.children && findPath(block.children, newPath)) {
					return true
				}
			}
			return false
		}

		findPath(blocks.value, [])
		return path
	}

	const getBlocksAsJson = () => {
		return JSON.stringify(blocks.value, null, 2)
	}

	const loadBlocksFromJson = (json: string) => {
		try {
			const parsedBlocks = JSON.parse(json)
			setBlocks(parsedBlocks)
		} catch (error) {
			console.error('Failed to parse blocks JSON:', error)
			throw new Error('Invalid JSON format')
		}
	}

	return {
		// State
		blocks: readonly(blocks),
		selectedBlockId: readonly(selectedBlockId),
		isEditing: readonly(isEditing),
		history: readonly(history),
		devicePreview: readonly(devicePreview),
		showSettings: readonly(showSettings),
		showBlockInserter: readonly(showBlockInserter),

		// Getters
		selectedBlock,
		canUndo,
		canRedo,
		rootBlocks,
		blockContext,

		// Actions
		addBlock,
		insertBlock,
		removeBlock,
		duplicateBlock,
		moveBlock,
		updateBlockContent,
		updateBlockSettings,
		selectBlock,
		saveToHistory,
		undo,
		redo,
		setBlocks,
		clearBlocks,
		setDevicePreview,
		toggleBlockInserter,
		toggleSettings,
		findBlockIndex,
		getBlockPath,
		getBlocksAsJson,
		loadBlocksFromJson
	}
})

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(useEditorStore, import.meta.hot))
}