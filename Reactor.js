const EventEmitter = require('events')
const {
  TASK_CHANGE_STATUS_EVENT,
  REACTOR_STEP_START_EVENT,
  REACTOR_STEP_END_EVENT,
  REACTOR_STEP_ERROR,
  TASK_ADDED_NEW_STEP_EVENT,
  TASK_PROCESSING,
  TASK_STARTING,
  TASK_STOPING,
  TASK_STOPED,
} = require('./constants')
const delay = require('delay')
const statusSymbol = Symbol('reactorStatus')
const stepsSymbol = Symbol('reactorSteps')


/**
 * @description
 * lifeCycle
 *
 * @param {Object} options
 *
 * @event TASK_CHANGE_STATUS_EVENT
 * @event REACTOR_STEP_START_EVENT
 * @event REACTOR_STEP_END_EVENT
 * @event REACTOR_STEP_ERROR
 * @event TASK_ADDED_NEW_STEP_EVENT
 * @event TASK_PROCESSING
 * @event TASK_STARTING
 * @event TASK_STOPING
 * @event TASK_STOPED
 * @event error
 */
class Reactor extends EventEmitter {
  constructor(options={}) {
    super()
    /** Таймаут мажду шагами таски */
    this.stepTimeout = 10
    /** Шаги выполнения задачи */
    this[stepsSymbol] = []
    /** Статус таски */
    this.initTime = new Date(),
    this.startTime = null,
    this.stopTime = null,
    this[statusSymbol] = TASK_STOPED

    this.on(TASK_CHANGE_STATUS_EVENT, status => {
      this[statusSymbol] = status
    })

    this.on('error', err => {
      this.log('error', 'event event: error' )
      this.log('error', err)
    })

    this.on(TASK_CHANGE_STATUS_EVENT, () => {
      if (this[statusSymbol] === TASK_STARTING) {
        setImmediate(() => {
          this.emit(TASK_CHANGE_STATUS_EVENT, TASK_PROCESSING)
          this.__startLifeCycle()
        })
      }
    })
  }

  /**
   * @description
   *  logger method
   * @param {String} level
   * @param {Mixed} args
   */
  log(level, ...args) {
    console.log(`[${level}] `, ...args)
  }

  /**
   *
   */
  start() {
    const prom = new Promise((resolve, reject) => {
      this.emit(TASK_CHANGE_STATUS_EVENT, TASK_STARTING)
      this.once(TASK_CHANGE_STATUS_EVENT, status => {
        if (status === TASK_PROCESSING) {
          this.startTime = new Date()

          resolve()
        } else {
          reject(new Error(`Starting is calceled. next status is ${this[statusSymbol]}`))
        }
      })
    })

    return prom
  }

  stop() {
    const prom = new Promise((resolve, reject) => {
      this.emit(TASK_CHANGE_STATUS_EVENT, TASK_STOPING)
      this.once(TASK_CHANGE_STATUS_EVENT, status => {
        if (status === TASK_STOPED) {
          this.stopTime = new Date()

          resolve()
        } else {
          reject(new Error(`Stoping is calceled. next status is ${this[statusSymbol]}`))
        }
      })
    })

    return prom
  }

  addStep(func) {
    const stepsCount = this[stepsSymbol].push(func)

    this.emit(TASK_ADDED_NEW_STEP_EVENT, stepsCount)
  }

  exit(err=null) {
    if (err === null || err === undefined) {
      // Если ошибки нет - ждем завершения очереди шагов задачи
      this.on(REACTOR_STEP_START_EVENT, status => {
        if (this[stepsSymbol].length === 0) {
          process.exit()
        }
      })

      this.on(REACTOR_STEP_END_EVENT, status => {
        if (this[stepsSymbol].length === 0) {
          process.exit()
        }
      })
    } else {
      // При ошибке выходим из приложения сразу
      process.exit()
    }
  }


  /**
   * @description
   *
   * @private
   *
   * @return {Promise}
   */
  __lifeCycle__() {
    this.emit(REACTOR_STEP_START_EVENT)

    switch (this[statusSymbol]) {
      // exec task step function
      case TASK_PROCESSING: {
        const stepFunction = this[stepsSymbol].shift()

        if (typeof stepFunction === 'function') {
          setImmediate(() => {
            stepFunction().catch(err => {
              this.emit(REACTOR_STEP_ERROR, err)
            })
          })

          setTimeout(() => {
            this.emit(REACTOR_STEP_END_EVENT)
            this.__lifeCycle__()
          }, this.stepTimeout)
        } else {
          setTimeout(() => {
            this.emit(REACTOR_STEP_END_EVENT)
            this.__lifeCycle__()
          }, this.stepTimeout)
        }

        return
      }

      case TASK_STOPING: {
        this.emit(TASK_CHANGE_STATUS_EVENT, TASK_STOPED)

        break
      }

      case TASK_STOPED:
        return;
    }

    setTimeout(() => {
      this.emit(REACTOR_STEP_END_EVENT)
      this.__lifeCycle__()
    }, this.stepTimeout)
  }


  /**
   * @description
   *
   * @private
   *
   * @return {Promise}
   */
  __startLifeCycle() {
    // Starting life cycle
    return this.__lifeCycle__()
  }
}

module.exports = {
  Reactor,
  TASK_CHANGE_STATUS_EVENT,
  REACTOR_STEP_START_EVENT,
  REACTOR_STEP_END_EVENT,
  REACTOR_STEP_ERROR,
  TASK_ADDED_NEW_STEP_EVENT,
  TASK_PROCESSING,
  TASK_STARTING,
  TASK_STOPING,
  TASK_STOPED,
}
