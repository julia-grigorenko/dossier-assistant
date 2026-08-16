import { z } from "zod";

import {
    failureCallbackSchema,
    successCallbackSchema,
    workflowCallbackSchema,
    workflowContextDataSchema,
    workflowContextResponseSchema,
    workflowTriggerSchema,
} from "./workflow.schemas";

export type WorkflowTrigger = z.infer<
    typeof workflowTriggerSchema
>;

export type WorkflowContextData = z.infer<
    typeof workflowContextDataSchema
>;

export type WorkflowContextResponse = z.infer<
    typeof workflowContextResponseSchema
>;

export type WorkflowSuccessCallback = z.infer<
    typeof successCallbackSchema
>;

export type WorkflowFailureCallback = z.infer<
    typeof failureCallbackSchema
>;

export type WorkflowCallback = z.infer<
    typeof workflowCallbackSchema
>;