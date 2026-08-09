import { gql } from 'urql'

export const TriggerWorkflowRunMutation = gql`
  mutation TriggerWorkflowRun($workflow_id: uuid!) {
    triggerWorkflowRun(workflow_id: $workflow_id) {
      run_id
      status
    }
  }
`
