import { gql } from 'urql'

export const GetWorkflowLiveStatusQuery = gql`
  query GetWorkflowLiveStatus($workflowId: uuid!) {
    workflow_runs(
      where: { workflow_id: { _eq: $workflowId } }
      order_by: { started_at: desc }
      limit: 1
    ) {
      id
      status
      started_at
      completed_at
      step_runs(order_by: { workflow_step: { position: asc } }) {
        id
        status
        completed_at
        attempt_count
        input
        output
        error
        workflow_step {
          id
          name
          type
          position
        }
      }
    }
  }
`
