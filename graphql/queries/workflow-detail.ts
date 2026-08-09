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
