import React from 'react';

interface TeacherAvatarProps {
  teacher: {
    name: string;
    firstName?: string;
    surname?: string;
    avatarColor?: string;
    avatar?: string;
  };
  className?: string;
}

export const TeacherAvatar: React.FC<TeacherAvatarProps> = ({ teacher, className = 'w-11 h-11' }) => {
  if (teacher.avatar) {
    return (
      <img
        src={teacher.avatar}
        alt={teacher.name || 'Teacher'}
        className={`${className} rounded-full object-cover bg-slate-100 dark:bg-slate-800 shrink-0 select-none`}
      />
    );
  }

  const initials = teacher.firstName && teacher.surname
    ? `${teacher.firstName.charAt(0)}${teacher.surname.charAt(0)}`
    : (teacher.name || 'Instructor').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className={`${className} rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm flex items-center justify-center shadow-sm shrink-0 select-none`}>
      {initials || 'TI'}
    </div>
  );
};
