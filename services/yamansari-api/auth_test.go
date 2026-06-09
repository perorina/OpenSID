package main

import "testing"

func TestLegacyOpenSIDPIN(t *testing.T) {
	got := legacyOpenSIDPIN("123456")
	want := "3645e735f033e8482be0c7993fcba946"
	if got != want {
		t.Fatalf("legacyOpenSIDPIN() = %s, want %s", got, want)
	}

	if verifyPIN("123456", want) != true {
		t.Fatal("verifyPIN should accept legacy OpenSID hash")
	}
}
