// Simple Web Worker test
console.log('Simple worker loaded');

self.onmessage = function(event) {
  console.log('Worker received message:', event.data);
  
  const { type, data } = event.data;
  
  if (type === 'TEST') {
    self.postMessage({
      type: 'TEST_RESPONSE',
      data: { message: 'Worker is working!' }
    });
  } else if (type === 'CONNECT') {
    console.log('Connect request received:', data);
    
    // Test EventSource connection
    try {
      const eventSource = new EventSource(data.endpoint);
      
      eventSource.onopen = function() {
        console.log('EventSource opened');
        self.postMessage({
          type: 'CONNECTION_STATUS',
          data: { isConnected: true }
        });
      };
      
      eventSource.onmessage = function(event) {
        console.log('EventSource message:', event.data);
        self.postMessage({
          type: 'AGENT_RESPONSE',
          data: { message: event.data }
        });
      };
      
      eventSource.onerror = function(error) {
        console.error('EventSource error:', error);
        self.postMessage({
          type: 'ERROR',
          data: { message: 'EventSource error' }
        });
      };
      
    } catch (error) {
      console.error('Error creating EventSource:', error);
      self.postMessage({
        type: 'ERROR',
        data: { message: 'Failed to create EventSource: ' + error.message }
      });
    }
  }
};

console.log('Simple worker initialized');
