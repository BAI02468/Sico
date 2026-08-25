package enum

import (
	"reflect"
	"testing"
)

func TestAllAgentRoles(t *testing.T) {
	want := []string{
		"General",
		"Software Testing",
		"Design",
		"Product Development",
		"Marketing",
	}
	if got := AllAgentRoles(); !reflect.DeepEqual(got, want) {
		t.Fatalf("AllAgentRoles() = %#v, want %#v", got, want)
	}
}
