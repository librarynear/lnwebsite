#ifndef HARDWARE_CONTROLLER_H
#define HARDWARE_CONTROLLER_H

#include <Arduino.h>

class HardwareController {
public:
    HardwareController();
    void init();
    void unlockDoor();
    void lockDoor();
    void update(); // call in loop for non-blocking relay

private:
    unsigned long unlockTime;
    bool isUnlocked;
};

#endif // HARDWARE_CONTROLLER_H
