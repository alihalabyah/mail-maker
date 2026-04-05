"use client";

interface HeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export function Header({ title, actions }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-white">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </header>
  );
}
