package controller

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/types"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestShouldRetryRetryableGatewayTimeout(t *testing.T) {
	t.Parallel()

	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	err := types.NewOpenAIError(
		http.ErrHandlerTimeout,
		types.ErrorCodeBadResponseStatusCode,
		http.StatusGatewayTimeout,
		types.ErrOptionWithRetryable(),
	)

	require.True(t, shouldRetry(c, err, 1))
}

func TestShouldRetryPlainGatewayTimeoutKeepsLegacySkip(t *testing.T) {
	t.Parallel()

	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	err := types.NewOpenAIError(
		http.ErrHandlerTimeout,
		types.ErrorCodeBadResponseStatusCode,
		http.StatusGatewayTimeout,
	)

	require.False(t, shouldRetry(c, err, 1))
}
