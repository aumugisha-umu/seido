'use client'

import { useEffect } from 'react'
import { logger, logError, setupGlobalErrorHandling } from './logger'

// Hook pour logger les actions des composants React
export const useComponentLogger = (componentName: string) => {
  const componentLogger = logger.child({ component: componentName })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logAction = (action: string, metadata?: Record<string, any>) => {
    componentLogger.info({
      type: 'component_action',
      action,
      metadata
    }, `🎯 ${componentName}: ${action}`)
  }

  const logError = (error: Error, action?: string) => {
    componentLogger.error({
      type: 'component_error',
      action,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    }, `❌ ${componentName} error${action ? ` in ${action}` : ''}: ${error.message}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logRender = (props?: Record<string, any>) => {
    componentLogger.debug({
      type: 'component_render',
      props: props ? Object.keys(props) : undefined
    }, `🔄 ${componentName} rendered`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logStateChange = (state: string, value: unknown) => {
    componentLogger.debug({
      type: 'component_state_change',
      state,
      value: typeof value === 'object' ? JSON.stringify(value) : value
    }, `🔄 ${componentName} state changed: ${state}`)
  }

  return {
    logAction,
    logError,
    logRender,
    logStateChange
  }
}

// Hook pour logger les erreurs de composants
export const useErrorLogger = (componentName: string) => {
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      logError(new Error(error.message), componentName)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logError(new Error(event.reason), componentName)
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [componentName])
}

// Hook pour logger les performances des composants
export const usePerformanceLogger = (componentName: string) => {
  useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      logger.info({
        type: 'component_performance',
        component: componentName,
        duration: Math.round(duration * 100) / 100
      }, `⏱️ ${componentName} mounted for ${Math.round(duration)}ms`)
    }
  }, [componentName])
}

// Hook pour logger les interactions utilisateur
export const useInteractionLogger = (componentName: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logClick = (element: string, metadata?: Record<string, any>) => {
    logger.info({
      type: 'user_interaction',
      component: componentName,
      interaction: 'click',
      element,
      metadata
    }, `👆 ${componentName}: Click on ${element}`)
  }

  const logHover = (element: string) => {
    logger.debug({
      type: 'user_interaction',
      component: componentName,
      interaction: 'hover',
      element
    }, `👆 ${componentName}: Hover on ${element}`)
  }

  const logFocus = (element: string) => {
    logger.debug({
      type: 'user_interaction',
      component: componentName,
      interaction: 'focus',
      element
    }, `👆 ${componentName}: Focus on ${element}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logFormSubmit = (formName: string, success: boolean, metadata?: Record<string, any>) => {
    const level = success ? 'info' : 'error'
    const emoji = success ? '✅' : '❌'
    
    logger[level]({
      type: 'user_interaction',
      component: componentName,
      interaction: 'form_submit',
      formName,
      success,
      metadata
    }, `${emoji} ${componentName}: Form ${formName} ${success ? 'submitted' : 'failed'}`)
  }

  return {
    logClick,
    logHover,
    logFocus,
    logFormSubmit
  }
}

// Composant wrapper pour logger automatiquement
export const withLogger = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return function LoggedComponent(props: P) {
    const { logRender, logError } = useComponentLogger(componentName)
    useErrorLogger(componentName)
    usePerformanceLogger(componentName)

    useEffect(() => {
      logRender(props)
    })

    try {
      return <Component {...props} />
    } catch (error) {
      logError(error as Error, 'render')
      throw error
    }
  }
}

// Initialisation globale des logs
export const initializeLogging = () => {
  setupGlobalErrorHandling()
  logger.info('🚀 Logging system initialized')
}

const reactLogger = {
  useComponentLogger,
  useErrorLogger,
  usePerformanceLogger,
  useInteractionLogger,
  withLogger,
  initializeLogging
}

export default reactLogger

