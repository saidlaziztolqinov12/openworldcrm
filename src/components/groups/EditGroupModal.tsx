import React from 'react';
import { Group } from '../../types';
import { GroupModal } from './GroupModal';

export interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group?: Group | null;
  groupToEdit?: Group | null;
  onSuccess?: (groupId: string) => void;
}

export const EditGroupModal: React.FC<EditGroupModalProps> = ({
  isOpen,
  onClose,
  group,
  groupToEdit,
  onSuccess
}) => {
  return (
    <GroupModal
      isOpen={isOpen}
      onClose={onClose}
      groupToEdit={group || groupToEdit}
      onSuccess={onSuccess}
    />
  );
};
