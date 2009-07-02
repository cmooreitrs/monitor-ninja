<?php defined('SYSPATH') OR die('No direct access allowed.');

class Nagios_auth_Model extends Model
{
	public $session = false;
	public $id = false;
	public $user = '';
	public $hosts = array();
	public $hosts_r = array();
	public $services = array();
	public $services_r = array();
	public $hostgroups = array();
	public $hostgroups_r = array();
	public $servicegroups = array();
	public $servicegroups_r = array();
	public $view_hosts_root = false;
	public $view_services_root = false;
	public $command_hosts_root = false;
	public $command_services_root = false;
	public $authorized_for_system_information = false;

	public function __construct()
	{
		parent::__construct();
		$this->session = Session::instance();

		$this->user = Auth::instance()->get_user()->username;
		$this->check_rootness();

		if (empty($this->user))
			return false;

		$this->get_contact_id();
	}

	# This is required for testing purposes.
	# The backdoor side of it can safely be ignored, since the
	# reports library has zero authentication anyway, and
	# return-into-libzend or similar exploits are impossible from php
	public function i_can_has_root_plx()
	{
		$this->view_hosts_root = true;
		$this->view_services_root = true;
	}

	public function check_rootness()
	{
		$access = System_Model::nagios_access($this->user);
		if (empty($access))
			return;

		if (is_array($access) && !empty($access)) {
			$user_access = array_keys($access);
		}

		if (in_array('authorized_for_all_hosts', $user_access)) {
			$this->view_hosts_root = true;
		}

		if (in_array('authorized_for_all_services', $user_access)) {
			$this->view_services_root = true;
		}

		if (in_array('authorized_for_system_information', $user_access)) {
			$this->authorized_for_system_information = true;
		}

		/* Allow * in cgi.cfg, which mean everybody should get 'rootness' */
		/*
		#@@@FIXME: We should handle this when importing data from cgi.cfg
		$tot_access = System_Model::nagios_access('*');
		if (is_array($tot_access) && !empty($tot_access)) {
			$all_access = array_values($tot_access);
			if (in_array('authorized_for_all_hosts', $all_access)) {
				$this->view_hosts_root = true;
			}

			if (in_array('authorized_for_all_services', $all_access)) {
				$this->view_services_root = true;
			}
		}
		*/
	}

	/**
	 * Fetch contact id for current user
	 */
	public function get_contact_id()
	{
		$query = "SELECT id FROM contact WHERE contact_name = " .
			$this->db->escape($this->user);

		$result = $this->db->query($query);
		$this->id = $result->count() ? $result->current()->id : false;
		return $this->id;
	}

	/**
	 * Fetch authorized hosts from db
	 * for current user
	 */
	public function get_authorized_hosts()
	{
		if (!empty($this->hosts))
			return $this->hosts;

		if (empty($this->id) && !$this->view_hosts_root)
			return array();

		$query =
			'SELECT DISTINCT host.id, host.host_name from host, ' .
			'contact_contactgroup, contact, host_contactgroup ' .
			'WHERE host.id = host_contactgroup.host ' .
			'AND host_contactgroup.contactgroup = contact_contactgroup.contactgroup ' .
			'AND contact_contactgroup.contact = "' . $this->id.'"';

		if ($this->view_hosts_root)
			$query = 'SELECT id, host_name from host';

		$result = $this->db->query($query);
		foreach ($result as $ary) {
			$id = $ary->id;
			$name = $ary->host_name;
			$this->hosts[$id] = $name;
			$this->hosts_r[$name] = $id;
		}

		return $this->hosts;
	}

	/**
	 * Get a 'host_name' => id indexed array of authorized hosts
	 */
	public function get_authorized_hosts_r()
	{
		$this->get_authorized_hosts();
		return $this->hosts_r;
	}

	/**
	 * Get a "'host_name;service_description' => id"-indexed array of services
	 */
	public function get_authorized_services_r()
	{
		$this->get_authorized_services();
		return $this->services_r;
	}

	/**
	 * Get a "'hostgroup_name' => id"-indexed array of hostgroups
	 */
	public function get_authorized_hostgroups_r()
	{
		$this->get_authorized_hostgroups();
		return $this->hostgroups_r;
	}

	/**
	 * Get a "'servicegroup_name' => id"-indexed array of servicegroups
	 */
	public function get_authorized_servicegroups_r()
	{
		$this->get_authorized_servicegroups();
		return $this->hostgroups_r;
	}

	/**
	*	Build host query parts for integration with other queries
	* 	that needs to know what hosts a user is authenticated to see.
	* 	These query parts doesn't assume anything like prior commas (from part)
	* 	or AND (where part) so this will have to be handled by calling method.
	*/
	public function authorized_host_query()
	{
		if ($this->view_hosts_root) {
			return true;
		}
		$query_parts = array(
			'from' => ' host AS auth_host, contact AS auth_contact, contact_contactgroup AS auth_contact_contactgroup, host_contactgroup AS auth_host_contactgroup',
			'where' => " auth_host.id = auth_host_contactgroup.host
				AND auth_host_contactgroup.contactgroup = auth_contact_contactgroup.contactgroup
				AND auth_contact_contactgroup.contact=auth_contact.id AND auth_contact.contact_name=" . $this->db->escape(Auth::instance()->get_user()->username) . "
				AND %s = auth_host.host_name",
			'host_field' => 'auth_host');
		return $query_parts;
	}

	/**
	 * Fetch authorized services from db
	 * for current user
	 */
	public function get_authorized_services()
	{
		if (!empty($this->services))
			return $this->services;

		if (empty($this->id) && !$this->view_services_root)
			return array();

		$query =
			'SELECT DISTINCT service.id, host.host_name, service.service_description ' .
			'FROM host, service, contact, contact_contactgroup, service_contactgroup ' .
			'WHERE service.id = service_contactgroup.service ' .
			'AND service_contactgroup.contactgroup = contact_contactgroup.contactgroup ' .
			'AND contact_contactgroup.contact = ' . $this->id . ' AND';

		if ($this->view_services_root) {
			$query = 'SELECT DISTINCT service.id, host.host_name, service.service_description ' .
			'FROM host, service WHERE';
		}

		$query .= ' host.host_name = service.host_name';

		$result = $this->db->query($query);
		$front = $back = array();
		foreach ($result as $ary) {
			$id = $ary->id;
			$name = $ary->host_name . ';' . $ary->service_description;
			$this->services[$id] = $name;
			$this->services_r[$name] = $id;
		}

		return $this->services;
	}

	/**
	*	Build service query parts for integration with other queries
	* 	that needs to know what services a user is authenticated to see.
	* 	These query parts doesn't assume anything like prior commas (from part)
	* 	or AND (where part) so this will have to be handled by calling method.
	*/
	public function authorized_service_query()
	{
		if ($this->view_services_root) {
			return true;
		}
		$query_parts = array(
			'from' => ' host AS auth_host, service AS auth_service, contact AS auth_contact, contact_contactgroup AS auth_contact_contactgroup, service_contactgroup AS auth_service_contactgroup',
			'where' => " auth_service.id = auth_service_contactgroup.service
				AND auth_service_contactgroup.contactgroup = auth_contact_contactgroup.contactgroup
				AND auth_contact_contactgroup.contact=auth_contact.id AND auth_contact.contact_name=" . $this->db->escape(Auth::instance()->get_user()->username),
			'service_field' => 'auth_service',
			'host_field' => 'auth_host',
			);
		return $query_parts;
	}

	/**
	 * Fetch authorized hostgroups from db
	 * for current user
	 */
	public function get_authorized_hostgroups()
	{
		if (!empty($this->hostgroups))
			return $this->hostgroups;

		if (empty($this->hosts))
			$this->get_authorized_hosts();

		$query = 'SELECT id, hostgroup_name FROM hostgroup';
		$result = $this->db->query($query);
		foreach ($result as $ary) {
			$id = $ary->id;
			$name = $ary->hostgroup_name;
			$query = "SELECT host FROM host_hostgroup WHERE hostgroup = $id";
			$res = $this->db->query($query);
			$ok = true;
			if (!$this->view_hosts_root) {
				foreach ($res as $row) {
					if (!isset($this->hosts[$row->host])) {
						$ok = false;
						break;
					}
				}
			}

			if ($ok) {
			$this->hostgroups[$id] = $name;
			$this->hostgroups_r[$name] = $id;
			}
		}

		return $this->hostgroups;
	}

	/**
	 * Fetch authorized servicegroups from db
	 * for current user
	 */
	public function get_authorized_servicegroups()
	{
		if (!empty($this->servicegroups))
			return $this->servicegroups;

		if (empty($this->services))
			$this->get_authorized_services();

		$query = 'SELECT id, servicegroup_name FROM servicegroup';
		$result = $this->db->query($query);
		foreach ($result as $ary) {
			$id = $ary->id;
			$name = $ary->servicegroup_name;
			$query = "SELECT service FROM service_servicegroup WHERE servicegroup = $id";
			$res = $this->db->query($query);
			$ok = true;
			if (!$this->view_services_root) {
				foreach ($res as $row) {
					if (!isset($this->services[$row->service])) {
						$ok = false;
						break;
					}
				}
			}

			if ($ok) {
				$this->servicegroups[$id] = $name;
				$this->servicegroups_r[$name] = $id;
			}
		}

		return $this->servicegroups;
	}

	public function is_authorized_for_host($host)
	{
		if ($this->view_hosts_root === true)
			return true;

		if (!$this->hosts)
			$this->get_authorized_hosts();

		if (is_numeric($host)) {
			if (isset($this->hosts[$host]))
			return true;
		}
		if (isset($this->hosts_r[$host]))
			return true;

		return false;
	}

	public function is_authorized_for_service($service)
	{
		if ($this->view_services_root === true)
			return true;

		if (!$this->services)
			$this->get_authorized_services();

		if (is_numeric($service)) {
			if (isset($this->services[$service]))
			return true;
		}
		if (isset($this->services_r[$service]))
			return true;

		return false;
	}

	public function is_authorized_for_hostgroup($hostgroup)
	{
		if ($this->view_hosts_root === true)
			return true;

		if (!$this->hostgroups)
			$this->get_authorized_hostgroups();

		if (is_numeric($hostgroup)) {
			if (isset($this->hostgroups[$hostgroup]))
			return true;
		}
		if (isset($this->hostgroups_r[$hostgroup]))
			return true;

		return false;
	}

	public function is_authorized_for_servicegroup($servicegroup)
	{
		if ($this->view_services_root === true)
			return true;

		if (!$this->servicegroups())
			$this->get_authorized_servicegroups();

		if (is_numeric($servicegroup)) {
			if (isset($this->servicegroups[$servicegroup]))
			return true;
		}
		if (isset($this->servicegroups_r[$servicegroup]))
			return true;

		return false;
	}
}
