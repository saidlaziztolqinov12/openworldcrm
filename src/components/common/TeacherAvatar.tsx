import React from 'react';

interface TeacherAvatarProps {
  teacher: {
    name: string;
    firstName?: string;
    surname?: string;
    avatarColor?: string;
  };
  className?: string;
}

export const TeacherAvatar: React.FC<TeacherAvatarProps> = ({ teacher, className = 'w-11 h-11' }) => {
  const initials = teacher.firstName && teacher.surname
    ? `${teacher.firstName.charAt(0)}${teacher.surname.charAt(0)}`
    : (teacher.name || 'Instructor').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const bgClass = teacher.avatarColor || 'bg-indigo-600';

  return (
    <div className={`${className} rounded-xl ${bgClass} text-white font-black text-sm flex items-center justify-center shadow-sm shrink-0 select-none`}>
      {initials || 'TI'}
    </div>
  );
};
