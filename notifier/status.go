package main

import (
	"fmt"
	"sync"

	"github.com/safing/portbase/api/client"
	"github.com/safing/portbase/formats/dsd"
	"github.com/safing/portbase/log"
)

// Security Level constants
const (
	systemStatusKey         = "runtime:system/status"
	selectSecurityStatusKey = "runtime:system/security-level"
)

var (
	systemStatusCache     = new(SystemStatus)
	systemStatusCacheLock sync.Mutex
)

// SystemStatus saves basic information about the Portmasters system status.
type SystemStatus struct {
	// ActiveSecurityLevel holds the currently
	// active security level.
	ActiveSecurityLevel uint8
	// SelectedSecurityLevel holds the security level
	// as selected by the user.
	SelectedSecurityLevel uint8
	// ThreatMitigationLevel holds the security level
	// as selected by the auto-pilot.
	ThreatMitigationLevel uint8
}

// GetStatus returns the system status.
func GetStatus() *SystemStatus {
	systemStatusCacheLock.Lock()
	defer systemStatusCacheLock.Unlock()

	return systemStatusCache
}

func updateStatus(s *SystemStatus) {
	systemStatusCacheLock.Lock()
	defer systemStatusCacheLock.Unlock()

	systemStatusCache = s
}

func statusClient() {
	statusOp := apiClient.Qsub(fmt.Sprintf("query %s", systemStatusKey), handleSystemStatus)
	statusOp.EnableResuscitation()
}

func handleSystemStatus(m *client.Message) {
	switch m.Type {
	case client.MsgError:
	case client.MsgDone:
	case client.MsgSuccess:
	case client.MsgOk, client.MsgUpdate, client.MsgNew:

		newStatus := &SystemStatus{}
		_, err := dsd.Load(m.RawValue, newStatus)
		if err != nil {
			log.Warningf("status: failed to parse new status: %s", err)
			return
		}
		updateStatus(newStatus)
		triggerTrayUpdate()

	case client.MsgDelete:
	case client.MsgWarning:
	case client.MsgOffline:

		updateStatus(new(SystemStatus))

	}
}

// SelectSecurityLevel sets the selected security level
func SelectSecurityLevel(level uint8) {
	apiClient.Update(selectSecurityStatusKey, &SystemStatus{SelectedSecurityLevel: level}, nil)
}
