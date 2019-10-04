package utilities;

import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.GraphicsDevice;
import java.awt.GraphicsEnvironment;
import java.awt.Rectangle;

import javax.swing.JFrame;

public class JEasyFrameFull extends JFrame {
	public final static GraphicsEnvironment env = GraphicsEnvironment
			.getLocalGraphicsEnvironment();
	public final static GraphicsDevice device = env.getScreenDevices()[0];
	public static final Rectangle RECTANGLE = device.getDefaultConfiguration()
			.getBounds();
	public static final int WIDTH = RECTANGLE.width;
	public static final int HEIGHT = RECTANGLE.height;

	public Component comp;

	public JEasyFrameFull(Component comp) {
		super();
		this.comp = comp;
		getContentPane().add(BorderLayout.CENTER, comp);
		comp.setPreferredSize(new Dimension(WIDTH, HEIGHT));
		this.setUndecorated(true);
		pack();
		this.setVisible(true);
		setDefaultCloseOperation(EXIT_ON_CLOSE);
		repaint();
	}
}
