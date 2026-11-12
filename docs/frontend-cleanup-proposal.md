# Frontend cleanup proposal — awaiting approval

No files have been deleted. Paths below are relative to `apps/frontend/`.

## Scope

Remove the superseded standalone scenario page, cinematic selection and intro animation, unused video player, old model modal wrapper, unused hooks and fictional geometry implementation, unreferenced starter CSS, duplicate `styles2` tree, and the listed unreferenced assets.

Import reachability was checked from the app entry point, including lazy routes and the external NetCDF experiment. Candidate references were also searched across frontend source and experiments. This is a static audit; no deletions have been validated by a post-removal build yet.

## Exact files proposed for deletion

- `public/loadingFish.svg`
- `public/sidemenu/aegeanItem.jpg`
- `public/sidemenu/anchovyItem.jpg`
- `public/sidemenu/northwesternseaItem.jpg`
- `public/vite.svg`
- `src/App.css`
- `src/components/FullBackgroundVideoPlayer/FullBackgroundVideoPlayer.module.css`
- `src/components/FullBackgroundVideoPlayer/FullBackgroundVideoPlayer.tsx`
- `src/components/ScenarioInfoModal/ScenarioInfoModal.tsx`
- `src/features/ScenarioRuns/useScenarioSetupCompletion.ts`
- `src/pages/ScenarioWorldPage/ScenarioWorldPage.module.css`
- `src/pages/ScenarioWorldPage/ScenarioWorldPage.tsx`
- `src/pages/ScenarioWorldPage/components/ScenarioWorldFeatureSection.tsx`
- `src/pages/ScenarioWorldPage/components/ScenarioWorldFooter.tsx`
- `src/pages/ScenarioWorldPage/components/ScenarioWorldStorySection.tsx`
- `src/pages/ScenarioWorldPage/hooks/useScenarioWorldRoute.ts`
- `src/pages/SimulationCaseSelectionPage/components/CaseStudyMap/geographic/anchovyBay.ts`
- `src/pages/SimulationCaseSelectionPage/components/CinematicCaseSelection/CinematicCaseSelection.module.css`
- `src/pages/SimulationCaseSelectionPage/components/CinematicCaseSelection/CinematicCaseSelection.tsx`
- `src/pages/SimulationCaseSelectionPage/components/OceanDiveIntro/OceanDiveIntro.module.css`
- `src/pages/SimulationCaseSelectionPage/components/OceanDiveIntro/OceanDiveIntro.tsx`
- `src/serverState/scenarios/useScenarioContract.ts`
- `src/styles2/aria/autocomplete/Autocomplete.module.css`
- `src/styles2/aria/button/Button.module.css`
- `src/styles2/aria/calendar/Calendar.module.css`
- `src/styles2/aria/checkbox-group/CheckboxGroup.module.css`
- `src/styles2/aria/checkbox/Checkbox.module.css`
- `src/styles2/aria/combo-box/ComboBox.module.css`
- `src/styles2/aria/date-picker/DatePicker.module.css`
- `src/styles2/aria/date-range-picker/DateRangePicker.module.css`
- `src/styles2/aria/field/Field.module.css`
- `src/styles2/aria/image-upload/ImageUpload.module.css`
- `src/styles2/aria/input/Input.module.css`
- `src/styles2/aria/menu/Menu.module.css`
- `src/styles2/aria/multi-select/MultiSelect.module.css`
- `src/styles2/aria/popover/Popover.module.css`
- `src/styles2/aria/primary-modal/PrimaryModal.module.css`
- `src/styles2/aria/radio-group/RadioGroup.module.css`
- `src/styles2/aria/radio/Radio.module.css`
- `src/styles2/aria/range-calendar/RangeCalendar.module.css`
- `src/styles2/aria/rich-text-editor/RichTextEditor.module.css`
- `src/styles2/aria/search-field/SearchField.module.css`
- `src/styles2/aria/select/Select.module.css`
- `src/styles2/aria/separator/Separator.module.css`
- `src/styles2/aria/sheet/Sheet.module.css`
- `src/styles2/aria/slider/Slider.module.css`
- `src/styles2/aria/switch/Switch.module.css`
- `src/styles2/aria/table/Table.module.css`
- `src/styles2/aria/tabs/Tabs.module.css`
- `src/styles2/aria/text-area/TextArea.module.css`
- `src/styles2/aria/time-field/TimeField.module.css`
- `src/styles2/aria/time-picker/TimePicker.module.css`
- `src/styles2/aria/toast/Toast.module.css`
- `src/styles2/aria/toggle-button-group/ToggleButtonGroup.module.css`
- `src/styles2/aria/toggle-button/ToggleButton.module.css`
- `src/styles2/aria/tooltip/Tooltip.module.css`
- `src/styles2/design-system/borders.css`
- `src/styles2/design-system/colors.css`
- `src/styles2/design-system/globals.css`
- `src/styles2/design-system/motion.css`
- `src/styles2/design-system/radii.css`
- `src/styles2/design-system/shadows.css`
- `src/styles2/design-system/spacing.css`
- `src/styles2/design-system/tokens.css`
- `src/styles2/design-system/typography.css`
- `src/styles2/themes/dark.css`
- `src/styles2/themes/light.css`

## Explicitly preserved

- All `src/components/ui/` React Aria components and current `src/styles/` styles.
- `/test`, its MsyModelPage implementation and all dependencies.
- DesignSystemPage and all dependencies.
- All ScenarioOutputs pages, features and assets, including currently unreachable output components.
- PrimaryModal and its stylesheet, because the preserved legacy output components still reference them.
- ScenarioModelFlowGraph, ScenarioFlowHoverCard, and their shared ScenarioInfoModal stylesheet, because the new sheets use them.
- Marine species images, pending a broader documentation/asset-use review.
- Package dependencies and lockfile; no package removals proposed.
- Videos and other assets referenced by the old cinematic UI; review separately after approval of the code cleanup.

No additional style selectors or files are authorized by this proposal. Any extra candidates found later will be listed separately.
