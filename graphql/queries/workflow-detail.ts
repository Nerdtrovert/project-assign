import { gql } from 'urql'

export const GetWorkflowDetailQuery = gql`
  query GetWorkflowDetail($id: uuid!) {
    workflows_by_pk(id: $id) {
      id
      name
      description
      org_id
      workflow_steps(order_by: { position: asc }) {
        id
        name
        type
        config
        position
      }
      workflow_triggers {
        id
        type
        config
        enabled
      }
      workflow_runs(order_by: { started_at: desc }, limit: 10) {
        id
        status
        started_at
        completed_at
        created_by
        step_runs(order_by: { started_at: asc }) {
          id
          status
          attempt_count
          input
          output
          error
          started_at
          completed_at
          workflow_step {
            id
            name
            type
            position
          }
        }
      }
    }
    org_members {
      org_id
      role
      organization {
        id
        name
      }
    }
  }
`
