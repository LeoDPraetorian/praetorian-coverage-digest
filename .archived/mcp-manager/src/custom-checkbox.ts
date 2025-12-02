import {
	createPrompt,
	useState,
	useKeypress,
	usePrefix,
	usePagination,
	useMemo,
	makeTheme,
	isUpKey,
	isDownKey,
	isSpaceKey,
	isNumberKey,
	isEnterKey,
	ValidationError,
	Separator,
	type Theme,
} from "@inquirer/core";
import type { PartialDeep } from "@inquirer/type";
import colors from "yoctocolors-cjs";
import figures from "@inquirer/figures";

type CheckboxTheme = {
	icon: {
		checked: string;
		unchecked: string;
		cursor: string;
	};
	style: {
		disabledChoice: (text: string) => string;
		renderSelectedChoices: <T>(
			selectedChoices: ReadonlyArray<NormalizedChoice<T>>,
			allChoices: ReadonlyArray<NormalizedChoice<T> | Separator>,
		) => string;
		description: (text: string) => string;
	};
	helpMode: "always" | "never" | "auto";
};

type CheckboxShortcuts = {
	selectToggle?: string | null;
};

type Choice<Value> = {
	value: Value;
	name?: string;
	description?: string;
	short?: string;
	disabled?: boolean | string;
	checked?: boolean;
	type?: never;
};

type NormalizedChoice<Value> = {
	value: Value;
	name: string;
	description?: string;
	short: string;
	disabled: boolean | string;
	checked: boolean;
};

const checkboxTheme: CheckboxTheme = {
	icon: {
		checked: colors.green(figures.circleFilled),
		unchecked: figures.circle,
		cursor: figures.pointer,
	},
	style: {
		disabledChoice: (text: string) => colors.dim(`- ${text}`),
		renderSelectedChoices: (selectedChoices) =>
			selectedChoices.map((choice) => choice.short).join(", "),
		description: (text: string) => colors.cyan(text),
	},
	helpMode: "auto",
};

function isSelectable<Value>(
	item: Separator | NormalizedChoice<Value>,
): item is NormalizedChoice<Value> {
	return !Separator.isSeparator(item) && !item.disabled;
}

function isChecked<Value>(
	item: Separator | NormalizedChoice<Value>,
): item is NormalizedChoice<Value> {
	return isSelectable(item) && item.checked;
}

function toggle<Value>(
	item: Separator | NormalizedChoice<Value>,
): Separator | NormalizedChoice<Value> {
	return isSelectable(item) ? { ...item, checked: !item.checked } : item;
}

function check<Value>(checked: boolean) {
	return function (
		item: Separator | NormalizedChoice<Value>,
	): Separator | NormalizedChoice<Value> {
		return isSelectable(item) ? { ...item, checked } : item;
	};
}

function normalizeChoices<Value>(
	choices: ReadonlyArray<string | Separator | Choice<Value>>,
): Array<Separator | NormalizedChoice<Value>> {
	return choices.map((choice) => {
		if (Separator.isSeparator(choice)) return choice;

		if (typeof choice === "string") {
			return {
				value: choice as Value,
				name: choice,
				short: choice,
				disabled: false,
				checked: false,
			};
		}

		const name = choice.name ?? String(choice.value);
		const normalizedChoice: NormalizedChoice<Value> = {
			value: choice.value,
			name,
			short: choice.short ?? name,
			disabled: choice.disabled ?? false,
			checked: choice.checked ?? false,
		};

		if (choice.description) {
			normalizedChoice.description = choice.description;
		}

		return normalizedChoice;
	});
}

export default createPrompt(
	<Value>(
		config: {
			message: string;
			prefix?: string;
			pageSize?: number;
			instructions?: string | boolean;
			choices: ReadonlyArray<string | Separator | Choice<Value>>;
			loop?: boolean;
			required?: boolean;
			validate?: (
				choices: ReadonlyArray<Choice<Value>>,
			) => boolean | string | Promise<string | boolean>;
			theme?: PartialDeep<Theme<CheckboxTheme>>;
			shortcuts?: CheckboxShortcuts;
		},
		done: (value: Array<Value>) => void,
	): string => {
		const {
			instructions,
			pageSize = 7,
			loop = true,
			required,
			validate = () => true,
		} = config;
		const shortcuts = { selectToggle: "s", ...config.shortcuts };
		const theme = makeTheme(checkboxTheme, config.theme);
		const [status, setStatus] = useState<"idle" | "done">("idle");
		const prefix = usePrefix({ status, theme });

		const [items, setItems] = useState<
			ReadonlyArray<Separator | NormalizedChoice<Value>>
		>(normalizeChoices(config.choices));

		const bounds = useMemo(() => {
			const first = items.findIndex(isSelectable);
			let last = -1;
			for (let i = items.length - 1; i >= 0; i--) {
				if (isSelectable(items[i])) {
					last = i;
					break;
				}
			}

			if (first === -1) {
				throw new ValidationError(
					"[checkbox prompt] No selectable choices. All choices are disabled.",
				);
			}

			return { first, last };
		}, [items]);

		const [active, setActive] = useState(bounds.first);
		const [showHelpTip, setShowHelpTip] = useState(true);
		const [errorMsg, setError] = useState<string | undefined>();

		useKeypress(async (key) => {
			if (isEnterKey(key)) {
				const selection = items.filter(isChecked);
				const isValid = await validate([...selection]);

				if (required && !items.some(isChecked)) {
					setError("At least one choice must be selected");
				} else if (isValid === true) {
					setStatus("done");
					done(selection.map((choice) => choice.value));
				} else {
					setError(isValid || "You must select a valid value");
				}
			} else if (isUpKey(key) || isDownKey(key)) {
				if (
					loop ||
					(isUpKey(key) && active !== bounds.first) ||
					(isDownKey(key) && active !== bounds.last)
				) {
					const offset = isUpKey(key) ? -1 : 1;
					let next = active;
					do {
						next = (next + offset + items.length) % items.length;
					} while (!isSelectable(items[next]));
					setActive(next);
				}
			} else if (
				isSpaceKey(key) ||
				key.name === "left" ||
				key.name === "right"
			) {
				setError(undefined);
				setShowHelpTip(false);
				setItems(items.map((choice, i) => (i === active ? toggle(choice) : choice)));
			} else if (key.name === shortcuts.selectToggle) {
				const selectAll = items.some(
					(choice) => isSelectable(choice) && !choice.checked,
				);
				setItems(items.map(check(selectAll)));
			} else if (isNumberKey(key)) {
				const selectedIndex = Number(key.name) - 1;
				let selectableIndex = -1;
				const position = items.findIndex((item) => {
					if (Separator.isSeparator(item)) return false;
					selectableIndex++;
					return selectableIndex === selectedIndex;
				});

				const selectedItem = items[position];
				if (selectedItem && isSelectable(selectedItem)) {
					setActive(position);
					setItems(
						items.map((choice, i) => (i === position ? toggle(choice) : choice)),
					);
				}
			}
		});

		const message = theme.style.message(config.message, status);
		let description: string | undefined;

		const page = usePagination({
			items,
			active,
			renderItem({ item, isActive }: { item: any; isActive: boolean }) {
				if (Separator.isSeparator(item)) {
					return ` ${item.separator}`;
				}

				if (item.disabled) {
					const disabledLabel =
						typeof item.disabled === "string" ? item.disabled : "(disabled)";
					return theme.style.disabledChoice(`${item.name} ${disabledLabel}`);
				}

				if (isActive) {
					description = item.description;
				}

				const checkbox = item.checked
					? theme.icon.checked
					: theme.icon.unchecked;
				const color = isActive ? colors.cyan : (x: string) => x;
				const cursor = isActive ? theme.icon.cursor : " ";

				return color(`${cursor}${checkbox} ${item.name}`);
			},
			pageSize,
			loop,
		});

		if (status === "done") {
			const selection = items.filter(isChecked);
			return `${prefix} ${message} ${colors.cyan(theme.style.renderSelectedChoices(selection, items))}`;
		}

		let helpTip = "";
		if (
			showHelpTip &&
			(instructions === undefined || instructions) &&
			theme.helpMode !== "never"
		) {
			if (typeof instructions === "string") {
				helpTip = instructions;
			} else {
				const keys = [
					`  (${colors.cyan("↑/↓")}) Navigate`,
					`  (${colors.cyan("←/→")}) Enable/Disable`,
				];

				if (shortcuts.selectToggle) {
					keys.push(`  (${colors.cyan(shortcuts.selectToggle)}) Select/Unselect`);
				}
				
				keys.push(`  (${colors.cyan("Enter")}) Confirm`);

				helpTip = `Keyboard Commands:\n${keys.join("\n")}`;
			}
		}

		let error = "";
		if (errorMsg) {
			error = `\n${colors.red(">")} ${errorMsg}`;
		}

		return `${helpTip}\n\n${prefix} ${message}\n${page}\n${description ? `\n${theme.style.description(description)}` : ""}${error}`;
	},
);

export { Separator };
