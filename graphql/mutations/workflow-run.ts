import { gql } from 'urql'

export const TriggerWorkflowRunMutation = gql`
  mutation TriggerWorkflowRun($workflow_id: uuid!, $customer_message: String) {
    triggerWorkflowRun(workflow_id: $workflow_id, customer_message: $customer_message) {
      run_id
      status
    }
  }
`
