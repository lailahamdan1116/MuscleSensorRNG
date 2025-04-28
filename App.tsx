import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';


//import * as Crypto from 'expo-crypto';

const Tab = createBottomTabNavigator();


// Screen 1: Data Reading Screen
function DataScreen({ isAutoRefresh, toggleAutoRefresh, fetchData, loading, dataList }: any) {
  return ( //automatically fetches one new reading
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Muscle Sensor Data</Text>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, isAutoRefresh ? styles.activeButton : styles.inactiveButton]}
          onPress={toggleAutoRefresh}
        >
          <Text style={styles.buttonText}>
            {isAutoRefresh ? 'Stop Auto-Refresh' : 'Start Auto-Refresh'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.fetchButton]}
          onPress={fetchData}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Manual Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dataContainer}>
        {dataList.length > 0 ? (
          <ScrollView>
            {dataList.map((value: number, index: number) => (
              <Text key={index} style={styles.dataItem}>
                Value: {value} (Reading #{dataList.length - index})
              </Text>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.noData}>No data available. Press refresh to fetch readings.</Text>
        )}
      </View>
    </SafeAreaView>
  );
}
//dataList = latest muscle sensor value
// Screen 2: Visualization Screen
function VisualizationScreen({ dataList }: any) {
  const latestValue = dataList.length > 0 ? dataList[0] : 0;

  // Determine muscle state
  let muscleState = 'relaxed';
  let color = '#2ecc71'; // Green
  if (latestValue > 800) {
    muscleState = 'strained';
    color = '#f39c12'; // Yellow
  }
  if (latestValue > 1300) {
    muscleState = 'very strained';
    color = '#e74c3c'; // Red
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Muscle State Visualization</Text>

      <View style={styles.visualizationContainer}>
        <View style={[styles.muscleIndicator, { backgroundColor: color }]}>
          <Text style={styles.indicatorText}>{muscleState.toUpperCase()}</Text>
          <Text style={styles.valueText}>{latestValue}</Text>
        </View>

        <View style={styles.colorScale}>
          <View style={[styles.scaleItem, { backgroundColor: '#2ecc71' }]}>
            <Text>Relaxed</Text>
          </View>
          <View style={[styles.scaleItem, { backgroundColor: '#f39c12' }]}>
            <Text>Slightly Strained</Text>
          </View>
          <View style={[styles.scaleItem, { backgroundColor: '#e74c3c' }]}>
            <Text>Very Strained</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Screen 3: RNG Placeholder Screen
//connects to ESP32's random endpoint.
function RNGScreen({ dataList = [] }: { dataList?: number[] }) {
  const [randomNumbers, setRandomNumbers] = useState<string[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectionStatus, setCollectionStatus] = useState("Ready");
  const [collectionLog, setCollectionLog] = useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const collectionIntervalRef = useRef<NodeJS.Timeout | null>(null); //

  const generateRandomNumber = async () => { //random value from esp32
    try {
      const response = await fetch("http://192.168.1.201/random"); //connects to board
      if (!response.ok) {
        console.error("Server error:", response.status);
        return null;
      }
      const json = await response.json();
      return json.random;
    } catch (error) {
      console.error("Fetch failed:", error);
      return null;
    }
  };

  const startCollection = () => {
    setIsCollecting(true);
    setCollectionStatus("Collecting...");
    setCollectionLog([]);

    // store the interval ID
    collectionIntervalRef.current = setInterval(async () => {
      const randomValue = await generateRandomNumber();
      if (randomValue !== null) {
        const timestamp = Date.now().toString();
        const logEntry = `${timestamp},${randomValue}`;

        setRandomNumbers(prev => [randomValue, ...prev.slice(0, 20)]);
        setCollectionLog(prev => [logEntry, ...prev]);
        setLastUpdate(Date.now());
      }
    }, 1000); //updates every secondd
  };

  const stopCollection = () => {
    if (collectionIntervalRef.current) {
      clearInterval(collectionIntervalRef.current); // really clear it
      collectionIntervalRef.current = null;
    }
    setIsCollecting(false);
    setCollectionStatus(`Completed (${collectionLog.length} values)`);
  };

const saveToFile = async () => {
  try {
    const path = RNFS.DownloadDirectoryPath + `/entropy_${Date.now()}.txt`;
    const fileContent = collectionLog.join('\n');

    await RNFS.writeFile(path, fileContent, 'utf8');

    Alert.alert("Success", `Saved ${collectionLog.length} values to:\n${path}`);
  } catch (error) {
    Alert.alert("Error", "Failed to save file");
    console.error("Save error:", error);
  }
};

  // Visual feedback for generation
  const getVisualization = () => {
    if (randomNumbers.length === 0) {
      return <Text style={styles.noData}>No data collected yet</Text>;
    }

    return (
 <ScrollView style={styles.dataContainer}>
   {collectionLog.map((entry, index) => (
     <Text key={index} style={styles.dataItem}>
       {entry}
     </Text>
   ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Muscle-Entropy RNG</Text>

      {/* Status Indicator */}
      <View style={styles.statusContainer}>
        <View style={[
          styles.statusIndicator,
          isCollecting && styles.statusActive,
          !isCollecting && collectionLog.length > 0 && styles.statusComplete
        ]}/>
        <Text style={styles.statusText}>
          {isCollecting ? "LIVE" : collectionStatus}
        </Text>
      </View>

      {/* Live Data Visualization */}
      {getVisualization()}

      {/* Control Buttons */}
      <View style={styles.controlRow}>
        <TouchableOpacity
          style={[styles.controlButton, isCollecting && styles.disabledButton]}
          onPress={startCollection}
          disabled={isCollecting}
        >
          <Text style={styles.buttonText}>Start</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !isCollecting && styles.disabledButton]}
          onPress={stopCollection}
          disabled={!isCollecting}
        >
          <Text style={styles.buttonText}>Stop</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, collectionLog.length === 0 && styles.disabledButton]}
          onPress={saveToFile}
          disabled={collectionLog.length === 0}
        >
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Connection Status */}
      <Text style={styles.connectionStatus}>

      </Text>
    </SafeAreaView>
  );
}


export default function App() {
  const [dataList, setDataList] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://192.168.1.201/data");
      const json = await response.json();
      setDataList(prev => [json.muscle, ...prev].slice(0, 50));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoRefresh) {
      interval = setInterval(fetchData, 500);
    }
    return () => clearInterval(interval);
  }, [isAutoRefresh]);

  const toggleAutoRefresh = () => {
    setIsAutoRefresh(!isAutoRefresh);
  };

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#3498db',
          tabBarInactiveTintColor: '#95a5a6',
          tabBarStyle: {
            backgroundColor: '#f5f5f5',
          },
        }}
      >
        <Tab.Screen name="Data">
          {() => (
            <DataScreen
              isAutoRefresh={isAutoRefresh}
              toggleAutoRefresh={toggleAutoRefresh}
              fetchData={fetchData}
              loading={loading}
              dataList={dataList}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Visualization">
          {() => <VisualizationScreen dataList={dataList} />}
        </Tab.Screen>
        <Tab.Screen name="RNG">
          {() => <RNGScreen dataList={dataList} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    minWidth: '48%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  activeButton: {
    backgroundColor: '#e74c3c',
  },
  inactiveButton: {
    backgroundColor: '#2ecc71',
  },
  fetchButton: {
    backgroundColor: '#3498db',
  },
  dataContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
  },
  dataItem: {
    fontSize: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    color: '#333',
  },
  noData: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 20,
  },
  visualizationContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  muscleIndicator: {
    height: 200,
    width: '100%',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    elevation: 5,
  },
  indicatorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  valueText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  colorScale: {
    marginTop: 20,
  },
  scaleItem: {
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  rngButton: {
    backgroundColor: '#9b59b6',
    marginBottom: 20,
  },
  rngContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
  },
  rngTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  rngValue: {
    fontFamily: 'monospace',
    fontSize: 16,
    marginVertical: 5,
    color: '#2980b9',
  },
  entropySource: {
    fontStyle: 'italic',
    marginBottom: 15,
    color: '#7f8c8d',
  },
  rngHelp: {
    marginTop: 15,
    color: '#95a5a6',
    fontSize: 12,
  },
  collectionControls: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  statusText: {
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold'
  },
  startButton: {
    backgroundColor: '#2ecc71'
  },
  stopButton: {
    backgroundColor: '#e74c3c'
  },
  disabledButton: {
    backgroundColor: '#95a5a6'
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ccc',
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: '#00ff00',
    shadowColor: '#00ff00',
    shadowRadius: 5,
  },
  statusComplete: {
    backgroundColor: '#3498db',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  hexGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  hexContainer: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
    margin: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  hexValue: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#333',
  },
  hexIndex: {
    fontSize: 10,
    color: '#666',
  },
  statsText: {
    textAlign: 'center',
    marginTop: 10,
    color: '#666',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  controlButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#3498db',
    minWidth: '30%',
    alignItems: 'center',
  },
  connectionStatus: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#7f8c8d',
    marginTop: 10,
  },
});
