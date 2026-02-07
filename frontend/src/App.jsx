import { BrowserRouter, HashRouter } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";

function App() {
  return (
    <HashRouter>
      <MainLayout />
    </HashRouter>
  );
}

export default App;
