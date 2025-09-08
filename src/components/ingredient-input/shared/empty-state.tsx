interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="text-center text-muted-foreground py-8">
      {message}
    </div>
  );
}