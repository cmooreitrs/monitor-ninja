<?php defined('SYSPATH') OR die('No direct access allowed.'); ?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">

<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
	<head>
		<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
		<title><?php if (isset($title)) echo html::specialchars($title) ?></title>
		<?php echo html::stylesheet('application/views/themes/default/css/default/common.css') ?>
		<?php echo html::stylesheet('application/views/themes/default/css/default/status.css') ?>
		<?php echo html::stylesheet('application/views/themes/default/css/default/autocomplete_styles.css') ?>
		<?php echo html::link('application/views/themes/default/icons/16x16/favicon.ico','icon','image/icon') ?>
		<?php echo (!empty($css_header)) ? $css_header : '' ?>
		<?php echo html::script('application/media/js/jquery.min.js') ?>
		<?php echo html::script('application/media/js/jquery.form.js') ?>
		<?php echo html::script('application/media/js/jquery.tablesorter.min.js') ?>
		<?php echo html::script('application/media/js/jquery.easywidgets.min.js') ?>
		<?php echo html::script('application/media/js/jquery-ui.min.js') ?>
		<?php echo html::script('application/media/js/jquery.autocomplete.min') ?>
		<?php echo html::script('application/views/themes/default/js/collapse_menu.js') ?>
		<?php echo html::script('application/views/themes/default/js/global_search.js') ?>
		<script type="text/javascript">
			//<!--
				var _site_domain = '<?php echo Kohana::config('config.site_domain') ?>';
				var _index_page = '<?php echo Kohana::config('config.index_page') ?>';
			//-->
		</script>
		<?php echo (!empty($js_header)) ? $js_header : '' ?>
	</head>

	<body onload="collapse_menu(''); widget_status()">
		<div id="top-bar">
			<?php echo html::image('application/views/themes/default/icons/ninja.png','NINJA'); ?>
			<form action="<?php echo Kohana::config('config.site_domain') ?><?php echo Kohana::config('config.index_page') ?>/search/lookup" id="global_search" method="get">
				<div id="navigation">
					<ul>
					<?php	$link = html::breadcrumb();
					for($i = 0; $i < count($link); $i++) {
						echo '<li>'.$link[$i].'</li>';
					}
					?>
					</ul>
					<input type="text" name="query" id="query" class="textbox" value="<?php echo $this->translate->_('Search')?>" onfocus="this.value=''" onblur="this.value='<?php echo $this->translate->_('Search')?>'" />
					<p><?php echo $this->translate->_('Welcome'); ?> <?php echo user::session('username') ?> | <?php echo html::anchor('default/logout', html::specialchars($this->translate->_('Log out'))) ?></p>
				</div>
			</form>
		</div>

		<div id="quickbar">
			<div id="quicklinks">
				<!--<ul>
					<li>Tactical Overview</li>
					<li>Host Detail</li>
					<li>Service Detail</li>
				</ul>-->
			</div>
			<div id="icons">
				<ul>
					<?php
						$settings_widgets = (isset($settings_widgets)) ? $settings_widgets : '';
						if (is_array($settings_widgets))
							echo '<li onclick="settings()">'.html::image('application/views/themes/default/icons/16x16/settings.gif',array('alt' => $this->translate->_('Settings'), 'title' => $this->translate->_('Settings'))).'</li>';
					?>
					<li onclick="window.location.reload()"><?php echo $this->translate->_('Updated') ?>: <?php echo date('d F Y H:i:s'); ?></li>
				</ul>
			</div>
		</div>

		<div id="menu">
			<div id="close-menu" title="<?php echo $this->translate->_('Hide menu') ?>" onclick="collapse_menu('hide')"></div>
			<div id="show-menu" title="<?php echo $this->translate->_('Show menu') ?>" onclick="collapse_menu('show')"></div>
			<ul>
			<?php
				foreach ($links as $header => $link):
						echo '<li class="header"><cite>'.html::specialchars($header).'</cite></li>';
						foreach ($link as $title => $url):
							if($url == str_replace('/ninja/index.php/','',$_SERVER['PHP_SELF']))
								echo '<li>'.html::anchor($url, html::image('application/views/themes/default/icons/16x16/star_highlight.png',array('title' => html::specialchars($title), 'alt' => html::specialchars($title)))).' '.html::anchor($url, html::specialchars($title),array('style' => 'font-weight: bold')).'</li>';
							else
								echo '<li>'.html::anchor($url, html::image('application/views/themes/default/icons/16x16/star.png',array('title' => html::specialchars($title), 'alt' => html::specialchars($title)))).' '.html::anchor($url, html::specialchars($title)).'</li>';
						endforeach;
					endforeach;
				?>
			</ul>
		</div>

		<div id="page_settings">
			<ul>
				<li class="header"><?php echo $this->translate->_('Availiable Widgets') ?></li>
				<?php
					if (is_array($settings_widgets)) {
						foreach($settings_widgets as $id => $widget) {
							echo '<li id="li_'.$id.'" class="selected" onclick="control_widgets(\''.$id.'\',this)">'.$widget.'</li>';
						}
					}
				?>
				<li onclick="control_widgets(); return false"><?php echo $this->translate->_('Restore to factory settings') ?></li>
			</ul>
		</div>
		<div id="content">
			<?php if (isset($content)) { echo $content; } else { url::redirect('tac'); } ?>
			<!--<p>Rendered in {execution_time} seconds, using {memory_usage} of memory</p> -->
		</div>
	</body>
</html>