import { gql } from 'urql'

export const InsertWorkflowStepMutation = gql`
  mutation InsertWorkflowStep($workflowId: uuid!, $name: String!, $type: String!, $config: jsonb, $position: Int!) {
    insert_workflow_steps_one(object: {
      workflow_id: $workflowId,
      name: $name,
      type: $type,
      config: $config,
      position: $position
    }) {
      id
      name
      type
      config
      position
    }
  }
`

export const UpdateWorkflowStepMutation = gql`
  mutation UpdateWorkflowStep($id: uuid!, $workflowId: uuid!, $name: String!, $type: String!, $config: jsonb) {
    update_workflow_steps(
      where: { id: { _eq: $id }, workflow_id: { _eq: $workflowId } }
      _set: { name: $name, type: $type, config: $config }
    ) {
      affected_rows
    }
  }
`

export const DeleteWorkflowStepMutation = gql`
  mutation DeleteWorkflowStep($id: uuid!, $workflowId: uuid!) {
    delete_workflow_steps(
      where: { id: { _eq: $id }, workflow_id: { _eq: $workflowId } }
    ) {
      affected_rows
    }
  }
`

export const UpdateWorkflowStepPositionMutation = gql`
  mutation UpdateWorkflowStepPosition($id: uuid!, $workflowId: uuid!, $position: Int!) {
    update_workflow_steps(
      where: { id: { _eq: $id }, workflow_id: { _eq: $workflowId } }
      _set: { position: $position }
    ) {
      affected_rows
    }
  }
`
