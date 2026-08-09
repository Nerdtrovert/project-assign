import { gql } from 'urql'

export const UpdateWorkflowMutation = gql`
  mutation UpdateWorkflow($id: uuid!, $name: String!, $description: String!) {
    update_workflows_by_pk(
      pk_columns: { id: $id }
      _set: { name: $name, description: $description }
    ) {
      id
      name
      description
    }
  }
`

export const DeleteWorkflowMutation = gql`
  mutation DeleteWorkflow($id: uuid!) {
    delete_workflows_by_pk(id: $id) {
      id
    }
  }
`
