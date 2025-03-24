{/*import React from 'react';
import DocumentUploader from './components/DocumentUploader';
import TodoApp from './components/TodoApp';

const App: React.FC = () => {
  return (
    <div className="App">
      <DocumentUploader />
      <TodoApp />
    </div>
  );
};

export default App;*/}


import React from 'react';
import DocumentUploader from './components/DocumentUploader';
import { useAuthenticator } from '@aws-amplify/ui-react';

const App: React.FC = () => {
  const { signOut } = useAuthenticator();

  return (
    <div className="App">
      <DocumentUploader />
      {/* <TodoApp /> */}
      <button onClick={signOut}>Sign out</button>
    </div>
  );
};

export default App;
