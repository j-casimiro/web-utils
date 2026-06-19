import React from 'react';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ToolWrapperProps {
  title: string;
  description: string;
  onBack: () => void;
  children: React.ReactNode;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export function ToolWrapper({
  title,
  description,
  onBack,
  children,
  theme,
  onToggleTheme,
}: ToolWrapperProps) {
  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to home</span>
          </Button>
          <div>
            <h2 className="text-[18px] font-semibold text-foreground tracking-tight">
              {title}
            </h2>
            <p className="text-[13px] text-muted-foreground">{description}</p>
          </div>
        </div>

        {onToggleTheme && theme && (
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleTheme}
            className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground h-9 w-9"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        )}
      </div>

      <Card className="border-border bg-card text-foreground shadow-xl">
        <CardContent className="pt-6">{children}</CardContent>
      </Card>
    </div>
  );
}

