import { createTemplateAction, executeShellCommand, ExecuteShellCommandOptions, TemplateAction } from '@backstage/plugin-scaffolder-node';
import { z } from 'zod';
import { resolveSafeChildPath } from '@backstage/backend-plugin-api';

export function executeShellCommandAction(): TemplateAction  {
  return createTemplateAction({
    id: 'custom:command:execute',
    schema: {
      input: z.object({
        scriptPath: z.string().describe('Command to execute'),
        arguments: z.array(z.string()).describe('Arguments of the command')
      }),
    },

    async handler(ctx) {
      const scriptPath = resolveSafeChildPath(ctx.workspacePath, ctx.input.scriptPath as string);
      const commandOptions: ExecuteShellCommandOptions = {
        command: "bash",
        args: [scriptPath, ...(ctx.input.arguments as string[])],

        logStream: ctx.logStream
      }
      executeShellCommand({ ...commandOptions });
    },
  });
};