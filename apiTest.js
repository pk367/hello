class StockDataWebSocket {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.retryInterval = 5000;
    }

    connect(symbol = 'GOLD', exchange = 'MCX', interval = 'in_5_minute', nBars = 100, futContract = 1) {
        const clientId = 'browser-client-' + Date.now();
        
        this.ws = new WebSocket(`ws://194.238.16.129:8080/ws/${clientId}`);

        this.ws.onopen = () => {
            console.log('Connected to WebSocket server');
            this.isConnected = true;
            this.retryCount = 0;
            
            const message = `${symbol},${exchange},${interval},${nBars},${futContract}`;
            this.ws.send(message);
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Check if there's an error message
                if (data.error) {
                    console.error('Server error:', data.error);
                    if (this.onError) {
                        this.onError(new Error(data.error));
                    }
                    return;
                }

                // Process the data
                if (data.data && Array.isArray(data.data)) {
                    // Convert ISO timestamp strings back to Date objects
                    data.data = data.data.map(item => ({
                        ...item,
                        datetime: new Date(item.datetime)
                    }));
                }

                console.log('Received data:', data);
                
                if (this.onDataUpdate) {
                    this.onDataUpdate(data);
                }
            } catch (error) {
                console.error('Error processing message:', error);
                if (this.onError) {
                    this.onError(error);
                }
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            if (this.onError) {
                this.onError(error);
            }
        };

        this.ws.onclose = () => {
            console.log('Disconnected from WebSocket server');
            this.isConnected = false;
            
            if (this.retryCount < this.maxRetries) {
                console.log(`Attempting to reconnect... (${this.retryCount + 1}/${this.maxRetries})`);
                setTimeout(() => {
                    this.retryCount++;
                    this.connect(symbol, exchange, interval, nBars, futContract);
                }, this.retryInterval);
            } else {
                console.log('Max retry attempts reached');
                if (this.onMaxRetriesReached) {
                    this.onMaxRetriesReached();
                }
            }
        };
    }

    updateParameters(symbol, exchange, interval, nBars, futContract) {
        if (this.isConnected) {
            const message = `${symbol},${exchange},${interval},${nBars},${futContract}`;
            this.ws.send(message);
        } else {
            console.error('WebSocket is not connected');
        }
    }

    disconnect() {
        if (this.ws) {
            this.retryCount = this.maxRetries; // Prevent auto-reconnect
            this.ws.close();
            this.ws = null;
        }
    }
}

// Usage example:
const stockWS = new StockDataWebSocket();

// Add event handlers
stockWS.onDataUpdate = (data) => {
    console.log('New data received:', data);
    // Example: Process the data
    if (data.data && data.data.length > 0) {
        const latestPrice = data.data[data.data.length - 1];
        console.log('Latest price:', latestPrice.Close);
        console.log('Timestamp:', latestPrice.datetime);
    }
};

stockWS.onError = (error) => {
    console.error('Error:', error.message);
};

stockWS.onMaxRetriesReached = () => {
    console.log('Could not reconnect to server');
};

// Connect to server
stockWS.connect('GOLD', 'MCX', 'in_5_minute', 100, 1);
