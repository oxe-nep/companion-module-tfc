import {
	FixupNumericOrVariablesValueToExpressions,
	type CompanionMigrationAction,
	type CompanionMigrationFeedback,
	type CompanionMigrationOptionValues,
	type CompanionStaticUpgradeScript,
} from '@companion-module/base';

const INDEX_OPTION_IDS = ['sourceIndex', 'targetIndex'] as const;

type JsonMap = { [key: string]: string | number | boolean | null };

function convertIndexOptions(options: CompanionMigrationOptionValues): boolean {
	let changed = false;

	for (const key of INDEX_OPTION_IDS) {
		const current = options[key];
		if (current === undefined) continue;

		const next = FixupNumericOrVariablesValueToExpressions(current);
		if (next === undefined) continue;

		if (JSON.stringify(next) !== JSON.stringify(current)) {
			options[key] = next;
			changed = true;
		}
	}

	return changed;
}

const migrateToApi2: CompanionStaticUpgradeScript<JsonMap, JsonMap> = (_context, props) => {
	const result = {
		updatedConfig: null as JsonMap | null,
		updatedSecrets: null as JsonMap | null,
		updatedActions: [] as CompanionMigrationAction[],
		updatedFeedbacks: [] as CompanionMigrationFeedback[],
	};

	if (props.config && 'password' in props.config) {
		const legacy = props.config as unknown as JsonMap & { password?: string };
		const { password, ...rest } = legacy;
		result.updatedConfig = rest;

		if (typeof password === 'string' && password.length > 0) {
			result.updatedSecrets = {
				...(props.secrets ?? { password: '' }),
				password,
			};
		}
	}

	for (const action of props.actions) {
		if (action.actionId === 'routeByIndex' && convertIndexOptions(action.options)) {
			result.updatedActions.push(action);
		}
	}

	for (const feedback of props.feedbacks) {
		if (feedback.feedbackId === 'routedSourceToVariableTarget' && convertIndexOptions(feedback.options)) {
			result.updatedFeedbacks.push(feedback);
		}
	}

	return result;
};

export const UpgradeScripts: CompanionStaticUpgradeScript<JsonMap, JsonMap>[] = [migrateToApi2];
