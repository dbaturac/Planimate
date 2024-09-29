import { useStorage } from '@/storage/StorageContext';
import { AgendaItemType, Task } from '@/types/schemas';
import { MarkedDates } from 'react-native-calendars/src/types';
import isEmpty from 'lodash/isEmpty';
import agendaItemType, { AgendaItemData } from '@/types/schemas/agendaItemType';
import { useTaskFromAgenda } from '@/hooks/tasks/useTaskFromAgenda';
import { fetchAgendaItems } from '@/api';
import { getLastUpdate } from '@/utils/getLastUpdate';
import { AgendaAction } from '@/types/offlineActions/agendaAction';
import { useOfflineActions } from '@/hooks/useOfflineActions';

export const useAgendaItems = () => {
	const storage = useStorage();
	const { addAction } = useOfflineActions();
	const { updateStoredTaskDuration, getTaskStorageKey } = useTaskFromAgenda();
	const loadStoredItems = () => {
		const storedItems = storage.getString('agenda');
		if (storedItems) {
			return JSON.parse(storedItems) as AgendaItemType[];
		}
		return [];
	};
	const lastUpdate = getLastUpdate(loadStoredItems());
	const token = storage.getString('token');
	const { data, dataUpdatedAt } = fetchAgendaItems(token, lastUpdate);
	const updateItems = (updatedItems: AgendaItemType[]) => {
		storage.set('agenda', JSON.stringify(updatedItems));
	};
	const replaceAgendaItem = (
		oldItems: AgendaItemType[],
		newItem: AgendaItemType,
	): AgendaItemType[] => {
		return oldItems.map(item =>
			item.title === newItem.title ? newItem : item,
		);
	};

	const addAgendaItem = (
		agendaItems: AgendaItemType[],
		newItem: AgendaItemType,
	): AgendaItemType[] => {
		const updatedItems = replaceAgendaItem(agendaItems, newItem);

		// If no matching item was found, append the new item
		if (!updatedItems.some(item => item.title === newItem.title)) {
			updatedItems.push(newItem);
		}

		return updatedItems;
	};

	const addSingleAgendaItem = (newItem: AgendaItemType) => {
		const updatedAgendaItems = addAgendaItem(loadStoredItems(), newItem);
		updateItems(updatedAgendaItems);
	};

	const addMultipleAgendaItems = (newItems: AgendaItemType[]) => {
		let agendaItems = loadStoredItems(); // Load once

		newItems.forEach(newItem => {
			agendaItems = addAgendaItem(agendaItems, newItem); // Modify in-memory agendaItems
		});

		updateItems(agendaItems); // Persist changes once after all operations
	};
	const getItems = () => {
		const storageUpdatedAt = storage.getNumber('agenda.updatedAt');
		if (data && dataUpdatedAt !== storageUpdatedAt) {
			addMultipleAgendaItems(data);
			storage.set('agenda.updatedAt', dataUpdatedAt);
		}
		return loadStoredItems();
	};
	const createAgendaItem = (
		date: Date,
		task: Task,
		duration: number,
		time?: Date,
	) => {
		const title = date.toISOString().split('T')[0];
		const storedId = storage.getNumber('agenda.id');
		const id = storedId || 0;
		const newItem: AgendaItemType = {
			title,
			updatedAt: new Date().toISOString(),
			data: [
				{
					time,
					duration,
					title: task.name,
					id: id + 1,
					key: title,
					goalId: task.goalId,
					taskId: task.taskId,
					parentId: task.parentId,
					completed: false,
				},
			],
		};
		storage.set('agenda.id', id + 1);
		const oldItems = loadStoredItems();
		const oldItem = oldItems.find(item => item.title === newItem.title);
		if (!oldItem) return newItem;
		return { ...oldItem, data: [...oldItem.data, ...newItem.data] };
	};
	const getMarkedDates = (items: agendaItemType[]) => {
		const marked: MarkedDates = {};

		items.forEach(item => {
			if (item.data && item.data.length > 0 && !isEmpty(item.data[0])) {
				marked[item.title] = { marked: true };
			} else {
				marked[item.title] = { disabled: true };
			}
		});
		return marked;
	};

	const deleteAgendaItem = (item: AgendaItemData): AgendaItemType[] => {
		const agendaItems = loadStoredItems();
		const updatedItems = agendaItems.map(agendaItem => {
			if (agendaItem.title === item.key) {
				return {
					...agendaItem,
					data: agendaItem.data.filter(
						filteredItem => filteredItem.id !== item.id,
					),
				};
			}
			return agendaItem;
		});
		const filteredItems = updatedItems.filter(
			agendaItem => agendaItem.data.length > 0,
		);
		updateItems(filteredItems);
		return filteredItems;
	};

	/**
	 * Updates the data field within an agenda item if there's a match.
	 * @param itemToUpdate - The item that needs its data field updated.
	 * @param updatedAgendaItem - The new agenda item data used to update.
	 */
	const updateAgendaItemData = (
		itemToUpdate: AgendaItemType,
		updatedAgendaItem: AgendaItemData,
	): AgendaItemType => ({
		...itemToUpdate,
		data: itemToUpdate.data.map(item =>
			item.id === updatedAgendaItem.id ? updatedAgendaItem : item,
		),
	});

	const updateAgendaItem = (agendaItem: AgendaItemData): AgendaItemType => {
		const storedAgendaItems = loadStoredItems();
		const itemToUpdate = storedAgendaItems.find(
			item => item.title === agendaItem.key,
		);
		if (!itemToUpdate) {
			throw new Error(`Agenda item with key ${agendaItem.key} not found`);
		}
		return updateAgendaItemData(itemToUpdate, agendaItem);
	};
	const completeAgendaItem = (item: AgendaItemData): AgendaItemType[] => {
		const completedItem = updateAgendaItem({ ...item, completed: true });
		const storedItems = loadStoredItems();
		const updatedItems = replaceAgendaItem(storedItems, completedItem);
		const taskStorageKey = getTaskStorageKey(item);
		updateStoredTaskDuration(item, taskStorageKey);
		updateItems(updatedItems);
		return updatedItems;
	};
	const findAgendaItemIdAndTitle = (
		itemData: AgendaItemData,
	): { id?: string; title: string } => {
		const agendaItems = loadStoredItems();
		const agendaItem = agendaItems.find(item =>
			item.data.some(d => d.id === itemData.id),
		);
		return agendaItem
			? { id: agendaItem.id, title: agendaItem.title }
			: { id: '', title: '' };
	};
	const addOfflineAction = (action: AgendaAction) => {
		addAction('agenda', action);
	};
	return {
		getItems,
		getMarkedDates,
		addSingleAgendaItem,
		deleteAgendaItem,
		completeAgendaItem,
		createAgendaItem,
		updateAgendaItem,
		updateItems,
		replaceAgendaItem,
		findAgendaItemIdAndTitle,
		data,
		addOfflineAction,
		addMultipleAgendaItems,
	};
};
