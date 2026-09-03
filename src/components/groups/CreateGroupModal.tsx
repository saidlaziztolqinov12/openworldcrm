import React from 'react';
import { GroupModal } from './GroupModal';

export interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (groupId: string) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  return (
    <GroupModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
};
