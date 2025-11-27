import AppHeader from './AppHeader';

interface LayoutProps {
  currentContext?: string;
  currentNamespace?: string;
  currentResourceType?: string;
  onContextChange: (context: string) => void;
  onNamespaceChange: (namespace: string) => void;
  onResourceTypeChange: (resourceType: string) => void;
  children: any;
}

const Layout = (props: LayoutProps) => {
  return (
    <>
      <AppHeader
        currentContext={props.currentContext}
        currentNamespace={props.currentNamespace}
        currentResourceType={props.currentResourceType}
        onContextChange={props.onContextChange}
        onNamespaceChange={props.onNamespaceChange}
        onResourceTypeChange={props.onResourceTypeChange}
      />
      {props.children}
    </>
  );
};

export default Layout;
