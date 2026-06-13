import { useState } from 'react';
import './App.css';

import { Button } from '@/components/ui/button';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-background text-foreground p-4">
      <Button
        variant="default"
        onClick={() => {
          setCount(count + 1);
        }}
      >
        Count: {count}
      </Button>
    </div>
  );
}

export default App;
