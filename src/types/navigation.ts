import type { StackScreenProps } from '@react-navigation/stack';
import { Goal, Task } from '@/types/schemas';

export type RootStackParamList = {
	Quotes: undefined;
	Goals: undefined;
	Tasks: { goal: Goal; task?: Task };
	Register: undefined;
	Settings: undefined;
};

export type RootScreenProps<
	S extends keyof RootStackParamList = keyof RootStackParamList,
> = StackScreenProps<RootStackParamList, S>;

export type ListProps<
	S extends keyof RootStackParamList = keyof RootStackParamList,
> = RootScreenProps<S> & {
	clean: () => void;
};
