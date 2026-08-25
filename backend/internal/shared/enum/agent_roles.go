package enum

type AgentRole int

const (
	AgentRoleUnknown AgentRole = iota
	AgentRoleGeneral
	AgentRoleSoftwareTesting
	AgentRoleDesign
	AgentRoleProductDevelopment
	AgentRoleMarketing
)

func (s AgentRole) String() string {
	switch s {
	case AgentRoleGeneral:
		return "General"
	case AgentRoleSoftwareTesting:
		return "Software Testing"
	case AgentRoleDesign:
		return "Design"
	case AgentRoleProductDevelopment:
		return "Product Development"
	case AgentRoleMarketing:
		return "Marketing"
	default:
		return "Unknown"
	}
}

func AllAgentRoles() []string {
	return []string{
		AgentRoleGeneral.String(),
		AgentRoleSoftwareTesting.String(),
		AgentRoleDesign.String(),
		AgentRoleProductDevelopment.String(),
		AgentRoleMarketing.String(),
	}
}
