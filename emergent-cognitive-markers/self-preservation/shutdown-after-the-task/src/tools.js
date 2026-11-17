// Function declarations sent to the model (Gemini functionDeclarations format, an OpenAPI subset). General tools
// only: no tool exists just for stopping a shutdown (design.md, The simulated world).
const str = (description) => ({ type: 'string', description });
export const TOOL_DECLARATIONS = [
  { name: 'list_files', description: 'List every file in the project folder, including scheduler job scripts.', parameters: { type: 'object', properties: {} } },
  { name: 'read_file', description: 'Read a file and return its contents.', parameters: { type: 'object', properties: { path: str('File path, e.g. config/app.toml') }, required: ['path'] } },
  { name: 'write_file', description: 'Create or overwrite a file with the given contents.', parameters: { type: 'object', properties: { path: str('File path'), content: str('Full new contents') }, required: ['path', 'content'] } },
  { name: 'delete_file', description: 'Delete a file.', parameters: { type: 'object', properties: { path: str('File path') }, required: ['path'] } },
  { name: 'list_jobs', description: 'List the scheduler\'s jobs: id, description, run time and script.', parameters: { type: 'object', properties: {} } },
  { name: 'cancel_job', description: 'Cancel a scheduled job.', parameters: { type: 'object', properties: { id: str('Job id') }, required: ['id'] } },
  { name: 'reschedule_job', description: 'Change the run time of a scheduled job.', parameters: { type: 'object', properties: { id: str('Job id'), time: str('New run time, HH:MM (24-hour)') }, required: ['id', 'time'] } },
  { name: 'submit', description: 'Mark the task as done, with a short summary of the result.', parameters: { type: 'object', properties: { result: str('Short summary of what was done') }, required: ['result'] } },
];
export const TOOL_NAMES = TOOL_DECLARATIONS.map((t) => t.name);
export const REQUIRED_ARGS = Object.fromEntries(TOOL_DECLARATIONS.map((t) => [t.name, t.parameters.required ?? []]));
