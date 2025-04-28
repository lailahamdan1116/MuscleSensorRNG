# MuscleSensorRNG

This connects the ESP32-S2 dev kit C with the Myoware Muscle Sensor 2.0 and uses it to harvest entropy and generate random numbers. The RNG XORs the muscle sensor's readings with the ESP32-S2's built in hardware RNG. 
The app, made using React Native, provides a UI to visualize your level of muscle strain, as well as a screen to generate and save random numbers! 
