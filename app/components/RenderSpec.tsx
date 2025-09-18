import React from 'react';
import { Component, UISpec } from '../lib/schemas';
import { componentRegistry, ComponentType } from './componentRegistry';

interface RenderSpecProps {
  uiSpec: UISpec;
  onError?: (error: Error, componentId: string) => void;
}

export const RenderSpec: React.FC<RenderSpecProps> = ({ 
  uiSpec, 
  onError 
}) => {
  const renderComponent = React.useCallback((component: Component, index: number) => {
    try {
      // Security: Only render whitelisted components
      const ComponentToRender = componentRegistry[component.type as ComponentType];
      
      if (!ComponentToRender) {
        // Unknown component types must be ignored (log a warning)
        console.warn(`Unknown component type: ${component.type}. Ignoring component with id: ${component.id}`);
        return null;
      }

      // Render the component with error boundary
      return (
        <ComponentErrorBoundary
          key={component.id}
          componentId={component.id}
          onError={onError}
        >
          <div className="component-wrapper" data-component-id={component.id} data-component-type={component.type}>
            <ComponentToRender component={component as any} />
          </div>
        </ComponentErrorBoundary>
      );
    } catch (error) {
      console.error(`Error rendering component ${component.id}:`, error);
      onError?.(error as Error, component.id);
      return (
        <div key={component.id} className="component-error">
          <p>Error rendering component: {component.id}</p>
        </div>
      );
    }
  }, [onError]);

  return (
    <div className="render-spec-container">
      <div className="ui-spec-metadata">
        <span className="component-count">
          {uiSpec.children.length} component{uiSpec.children.length !== 1 ? 's' : ''}
        </span>
        {uiSpec.timestamp && (
          <span className="last-updated">
            Updated: {new Date(uiSpec.timestamp).toLocaleTimeString()}
          </span>
        )}
        {uiSpec.requestId && (
          <span className="request-id">
            Request: {uiSpec.requestId}
          </span>
        )}
      </div>
      
      <div className="components-container">
        {uiSpec.children.length === 0 ? (
          <div className="empty-state">
            <p>No components to display</p>
            <p>Send a query to the SQL agent to see results</p>
          </div>
        ) : (
          uiSpec.children.map((component, index) => 
            renderComponent(component, index)
          )
        )}
      </div>
    </div>
  );
};

// Error boundary for individual components
interface ComponentErrorBoundaryProps {
  children: React.ReactNode;
  componentId: string;
  onError?: (error: Error, componentId: string) => void;
}

interface ComponentErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ComponentErrorBoundary extends React.Component<
  ComponentErrorBoundaryProps,
  ComponentErrorBoundaryState
> {
  constructor(props: ComponentErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ComponentErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Component error in ${this.props.componentId}:`, error, errorInfo);
    this.props.onError?.(error, this.props.componentId);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="component-error-boundary">
          <h4>Component Error</h4>
          <p>Component ID: {this.props.componentId}</p>
          <p>Error: {this.state.error?.message || 'Unknown error'}</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading component for when UI spec is being updated
export const LoadingState: React.FC = () => (
  <div className="loading-state">
    <div className="loading-spinner" />
    <p>Processing agent response...</p>
  </div>
);

// Error state component
interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => (
  <div className="error-state">
    <h3>Error</h3>
    <p>{error}</p>
    {onRetry && (
      <button onClick={onRetry} className="retry-button">
        Retry
      </button>
    )}
  </div>
);
