package utilities;

//mutable 2D vectors
public final class Vector2D {

	// fields
	public double x, y;

	// construct a null vector
	public Vector2D() {
		this.x = 0;
		this.y = 0;
	}

	// construct a vector with given coordinates
	public Vector2D(double x, double y) {
		this.x = x;
		this.y = y;
	}

	// construct a vector that is a copy of the argument
	public Vector2D(Vector2D v) {
		this.x = v.x;
		this.y = v.y;
	}

	// set coordinates
	public void set(double x, double y) {
		this.x = x;
		this.y = y;
	}

	// set coordinates to argument vector coordinates
	public void set(Vector2D v) {
		this.x = v.x;
		this.y = v.y;
	}

	// compare for equality (needs to allow for Object type argument...)
	public boolean equals(Object o) {
		if (o.getClass() == Vector2D.class) {
			// cast, compare coordinates
			Vector2D v = (Vector2D) o;
			if (v.x == this.x && v.y == this.y) {
				return true;
			}
		}
		return false;
	}

	// magnitude (= "length") of this vector
	public double mag() {
		return (Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2)));
	}

	// angle between vector and horizontal axis in radians
	public double theta() {
		return (Math.atan2(this.y, this.x));
	}

	// String for displaying vector as text
	public String toString() {
		return ("X: " + this.x + "Y:" + this.y + "Magg: " + this.mag());
	}

	// add argument vector
	public void add(Vector2D v) {
		this.x = this.x + v.x;
		this.y = this.y + v.y;
	}

	// add coordinate values
	public void add(double x, double y) {
		this.x = this.x + x;
		this.y = this.y + y;
	}

	// weighted add - frequently useful
	public void add(Vector2D v, double fac) {
		this.x = (this.x + v.x * fac);
		this.y = (this.y + v.y * fac);
	}

	// multiply with factor
	public void mult(double fac) {
		this.x = this.x * fac;
		this.y = this.y * fac;
	}

	// "wrap" vector with respect to given positive values w and h
	// method assumes that x >= -w and y >= -h
	public void wrap(double w, double h) {
		if (this.x < 0) {
			this.x = this.x + w;
		} else if (this.x > w) {
			this.x = this.x - w;
		}
		if (this.y < 0) {
			this.y = this.y + h;
		} else if (this.y > h) {
			this.y = this.y - h;
		}
	}

	// rotate by angle given in radians
	public void rotate(double theta) {
		double xx;
		double yy;
		xx = this.x;
		yy = this.y;

		this.x = x * Math.cos(theta) - y * Math.sin(theta);
		this.y = xx * Math.sin(theta) + yy * Math.cos(theta);
	}

	// scalar product with argument vector
	public double scalarProduct(Vector2D v) {
		return this.x * v.x + this.y * v.y;
	}

	// distance to argument vector
	public double dist(Vector2D v) {
		double dx = v.x - this.x;
		double dy = v.y - this.y;
		double dist = Math.sqrt((dx * dx) + (dy * dy));
		return dist;
	}

	// normalise vector so that mag becomes 1
	// direction is unchanged
	public void normalise() {
		double dan = this.mag();
		this.x = this.x * (1 / dan);
		this.y = this.y * (1 / dan);
	}

	@Override
	public int hashCode() {
		final int prime = 31;
		int result = 1;
		long temp;
		temp = Double.doubleToLongBits(x);
		result = prime * result + (int) (temp ^ (temp >>> 32));
		temp = Double.doubleToLongBits(y);
		result = prime * result + (int) (temp ^ (temp >>> 32));
		return result;
	}

}