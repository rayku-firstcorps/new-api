package service

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/types"
	"github.com/stretchr/testify/require"
)

func TestResetStatusCode(t *testing.T) {
	t.Parallel()

	testCases := []struct {
		name             string
		statusCode       int
		statusCodeConfig string
		expectedCode     int
	}{
		{
			name:             "map string value",
			statusCode:       429,
			statusCodeConfig: `{"429":"503"}`,
			expectedCode:     503,
		},
		{
			name:             "map int value",
			statusCode:       429,
			statusCodeConfig: `{"429":503}`,
			expectedCode:     503,
		},
		{
			name:             "skip invalid string value",
			statusCode:       429,
			statusCodeConfig: `{"429":"bad-code"}`,
			expectedCode:     429,
		},
		{
			name:             "skip status code 200",
			statusCode:       200,
			statusCodeConfig: `{"200":503}`,
			expectedCode:     200,
		},
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			newAPIError := &types.NewAPIError{
				StatusCode: tc.statusCode,
			}
			ResetStatusCode(newAPIError, tc.statusCodeConfig)
			require.Equal(t, tc.expectedCode, newAPIError.StatusCode)
		})
	}
}

func TestRelayErrorHandlerMarksRetryableResponse(t *testing.T) {
	t.Parallel()

	resp := &http.Response{
		StatusCode: http.StatusGatewayTimeout,
		Body: io.NopCloser(strings.NewReader(`{
			"title": "Error 504: Gateway time-out",
			"detail": "origin timeout",
			"retryable": true,
			"retry_after": 120
		}`)),
	}

	newAPIError := RelayErrorHandler(context.Background(), resp, false)
	require.NotNil(t, newAPIError)
	require.Equal(t, http.StatusGatewayTimeout, newAPIError.StatusCode)
	require.True(t, types.IsRetryableError(newAPIError))
}
