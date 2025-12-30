import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilNotes, cilShieldAlt } from '@coreui/icons'
import { CNavItem } from '@coreui/react'

const _nav = [
  {
    component: CNavItem,
    name: 'JSON Prompt Form',
    to: '/json-prompt-form',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
  },
]

// Note: Navigation items are only shown when user is authenticated
// Login page is handled separately in routing

export default _nav
